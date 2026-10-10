import { useState } from "react";
import { api } from "../services/api.js";
import { useAsync } from "../hooks/useAsync.js";
import { FREQUENCY_LABELS } from "../services/format.js";
import GardenForm from "../components/garden/GardenForm.jsx";
import PlantCard from "../components/garden/PlantCard.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Notice from "../components/ui/Notice.jsx";
import Spinner from "../components/ui/Spinner.jsx";

function Recommendation({ rec, added, onAdd }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const add = async (withTasks) => {
    setBusy(true);
    setErr(null);
    try {
      await onAdd(rec, withTasks);
    } catch (e) {
      setErr(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold">{rec.plant}</h3>
        <span className="text-sm text-ink/60">{rec.from_catalog ? "In the GrowMate catalog" : "Suggested by the model, not in the catalog"}</span>
      </div>
      <p className="mt-2">{rec.reason}</p>
      <p className="mt-2 text-ink/80"><span className="font-semibold">Care: </span>{rec.care_summary}</p>
      {rec.tasks.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {rec.tasks.map((t) => (
            <li key={t.title} className="rounded-full bg-moss-light px-3 py-1 text-sm text-moss-dark">
              {t.title} ({(FREQUENCY_LABELS[t.frequency] || t.frequency).toLowerCase()})
            </li>
          ))}
        </ul>
      )}
      {err && <div className="mt-3"><Notice tone="error" error={err} /></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        {added ? (
          <p className="font-semibold text-moss">Added to your garden</p>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={() => add(true)}>
              Add plant and {rec.tasks.length} {rec.tasks.length === 1 ? "task" : "tasks"}
            </Button>
            <Button size="sm" variant="quiet" disabled={busy} onClick={() => add(false)}>
              Add plant only
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

export default function Garden() {
  const garden = useAsync(() => api.getGarden(), []);
  const plants = useAsync(() => api.listPlants(), []);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  const [budget, setBudget] = useState("");
  const [maxPlants, setMaxPlants] = useState(5);
  const [useWeather, setUseWeather] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [added, setAdded] = useState({});
  const [manualName, setManualName] = useState("");
  const [manualError, setManualError] = useState(null);

  const saveGarden = async (values) => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await api.saveGarden(values);
      setSaved(true);
      garden.reload();
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    setPlanning(true);
    setPlanError(null);
    setPlan(null);
    setAdded({});
    try {
      const body = { garden_id: garden.data.id, max_plants: Number(maxPlants), use_weather: useWeather };
      if (budget !== "" && Number(budget) >= 0) body.budget = Number(budget);
      setPlan(await api.planPlanting(body));
    } catch (e) {
      setPlanError(e);
    } finally {
      setPlanning(false);
    }
  };

  const addRecommendation = async (rec, withTasks) => {
    const plant = await api.createPlant({
      name: rec.plant,
      care_summary: rec.care_summary,
      notes: rec.reason.slice(0, 500),
      source: rec.from_catalog ? "catalog" : "ai",
    });
    if (withTasks) {
      for (const t of rec.tasks) {
        await api.createTask({ title: t.title, frequency: t.frequency, plant_id: plant.id });
      }
    }
    setAdded((a) => ({ ...a, [rec.plant]: true }));
    plants.reload();
  };

  const addManual = async (e) => {
    e.preventDefault();
    if (!manualName.trim()) {
      setManualError("Enter a plant name.");
      return;
    }
    setManualError(null);
    try {
      await api.createPlant({ name: manualName.trim() });
      setManualName("");
      plants.reload();
    } catch (err) {
      setManualError(err.message);
    }
  };

  if (garden.loading && !garden.data && !garden.error) return <Spinner label="Loading your garden" />;

  return (
    <div className="space-y-8">
      <section className="panel" aria-labelledby="profile-h">
        <h1 id="profile-h" className="text-3xl font-bold">Your garden</h1>
        <p className="mb-5 mt-1 max-w-prose text-ink/70">The plan and answers get better the more accurate this is.</p>
        {garden.error && <div className="mb-4"><Notice tone="error" error={garden.error} /></div>}
        <GardenForm key={garden.data?.updated_at || "new"} initial={garden.data} onSave={saveGarden} saving={saving} />
        {saveError && <div className="mt-4"><Notice tone="error" error={saveError} /></div>}
        {saved && <p role="status" className="mt-4 font-semibold text-moss">Garden saved.</p>}
      </section>

      <section className="panel" aria-labelledby="plan-h">
        <h2 id="plan-h" className="text-2xl font-bold">Planting plan</h2>
        {!garden.data ? (
          <p className="mt-2 text-ink/70">Save your garden above to get a plan.</p>
        ) : (
          <>
            <p className="mt-1 max-w-prose text-ink/70">
              Gemma runs on your computer to suggest what to grow. Review each suggestion, then choose what to add.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-semibold">
                Budget (optional)
                <input className="input mt-1 font-normal" type="number" min="0" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g. 1000" />
              </label>
              <label className="text-sm font-semibold">
                Number of plants
                <select className="input mt-1 font-normal" value={maxPlants} onChange={(e) => setMaxPlants(e.target.value)}>
                  {[3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
                <input type="checkbox" className="h-5 w-5 accent-moss" checked={useWeather} onChange={(e) => setUseWeather(e.target.checked)} />
                Use today's weather (needs internet)
              </label>
            </div>
            <div className="mt-4">
              <Button onClick={generate} disabled={planning}>{planning ? "Gemma is thinking" : plan ? "Make a new plan" : "Generate my plan"}</Button>
            </div>
            {planning && (
              <div className="mt-4">
                <Spinner label="This can take a minute or two on a laptop CPU." />
              </div>
            )}
            {planError && (
              <div className="mt-4">
                <Notice tone="error" error={planError} action={<Button size="sm" variant="quiet" onClick={generate}>Try again</Button>} />
              </div>
            )}
            {plan && (
              <div className="mt-6">
                <ul className="space-y-4">
                  {plan.recommendations.map((rec) => (
                    <Recommendation key={rec.plant} rec={rec} added={!!added[rec.plant]} onAdd={addRecommendation} />
                  ))}
                </ul>
                <div className="mt-4 rounded-2xl bg-sun/15 p-4 text-sm ring-1 ring-sun/40">
                  <p className="font-semibold">Check before you buy</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {plan.limitations.map((l) => (<li key={l}>{l}</li>))}
                  </ul>
                  <p className="mt-2 text-ink/60">Generated by {plan.model}{plan.weather_used ? " with current weather" : ""}.</p>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="plants-h">
        <h2 id="plants-h" className="mb-3 text-2xl font-bold">Your plants</h2>
        {plants.error && <Notice tone="error" error={plants.error} />}
        {plants.data && plants.data.length === 0 && (
          <EmptyState title="No plants yet">Add one from your plan above, or type a name below.</EmptyState>
        )}
        {plants.data && plants.data.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plants.data.map((p) => (<PlantCard key={p.id} plant={p} />))}
          </ul>
        )}
        <form onSubmit={addManual} className="mt-4 flex flex-wrap items-start gap-2" noValidate>
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="manual-plant" className="sr-only">Plant name</label>
            <input id="manual-plant" className="input" value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Add a plant by name" />
            {manualError && <p role="alert" className="mt-1 text-sm font-medium text-rust">{manualError}</p>}
          </div>
          <Button type="submit" variant="quiet">Add plant</Button>
        </form>
      </section>
    </div>
  );
}
