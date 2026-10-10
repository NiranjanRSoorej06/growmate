import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useAsync } from "../hooks/useAsync.js";
import { formatDate, todayISO } from "../services/format.js";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Field from "../components/ui/Field.jsx";
import Notice from "../components/ui/Notice.jsx";
import Spinner from "../components/ui/Spinner.jsx";

export const HEALTH_LABELS = { thriving: "Thriving", okay: "Okay", struggling: "Struggling" };
const HEALTH_STYLES = {
  thriving: "bg-moss-light text-moss-dark",
  okay: "bg-mist text-ink",
  struggling: "bg-rust/10 text-rust",
};

export function EntryForm({ plants, fixedPlantId, onSaved }) {
  const [plantId, setPlantId] = useState(fixedPlantId ? String(fixedPlantId) : "");
  const [note, setNote] = useState("");
  const [height, setHeight] = useState("");
  const [health, setHealth] = useState("okay");
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!plantId) found.plant = "Choose which plant you looked at.";
    if (!note.trim()) found.note = "Write what you noticed.";
    if (height !== "" && (Number(height) < 0 || Number.isNaN(Number(height)))) found.height = "Height can't be negative.";
    setErrors(found);
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      await api.createEntry({
        plant_id: Number(plantId),
        note: note.trim(),
        height_cm: height === "" ? null : Number(height),
        health,
        observed_on: date,
      });
      setNote("");
      setHeight("");
      onSaved();
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="panel grid gap-3 sm:grid-cols-4">
      {!fixedPlantId && (
        <Field label="Plant" error={errors.plant} className="sm:col-span-2">
          <select className="input" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            <option value="">Choose a plant</option>
            {plants.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </Field>
      )}
      <Field label="Date" className={fixedPlantId ? "sm:col-span-2" : "sm:col-span-2"}>
        <input className="input" type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="What did you notice?" error={errors.note} className="sm:col-span-4">
        <textarea className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="New leaves on the left stem, soil still damp after two days" />
      </Field>
      <Field label="Height in cm (optional)" error={errors.height} className="sm:col-span-2">
        <input className="input" type="number" min="0" step="0.1" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
      </Field>
      <Field label="How does it look?" className="sm:col-span-2">
        <select className="input" value={health} onChange={(e) => setHealth(e.target.value)}>
          {Object.entries(HEALTH_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
        </select>
      </Field>
      {errors.form && <div className="sm:col-span-4"><Notice tone="error">{errors.form}</Notice></div>}
      <div className="sm:col-span-4"><Button type="submit" disabled={saving}>{saving ? "Saving" : "Save observation"}</Button></div>
    </form>
  );
}

export function EntryList({ entries, showPlant = true }) {
  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{formatDate(e.observed_on)}</span>
            {showPlant && (<Link to={`/plants/${e.plant_id}`} className="font-semibold text-moss underline">{e.plant_name}</Link>)}
            <span className={`rounded-full px-2.5 py-0.5 text-sm ${HEALTH_STYLES[e.health] || HEALTH_STYLES.okay}`}>{HEALTH_LABELS[e.health] || e.health}</span>
            {e.height_cm != null && <span className="text-sm text-ink/70">{e.height_cm} cm</span>}
          </div>
          <p className="mt-2 max-w-prose whitespace-pre-line">{e.note}</p>
        </li>
      ))}
    </ol>
  );
}

export default function GrowthJournal() {
  const [filter, setFilter] = useState("");
  const plants = useAsync(() => api.listPlants(), []);
  const entries = useAsync(() => api.listJournal({ plantId: filter || undefined }), [filter]);

  if (plants.loading && !plants.data) return <Spinner label="Loading journal" />;
  const plantList = plants.data || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Growth journal</h1>
      {plants.error && <Notice tone="error" error={plants.error} />}
      {plantList.length === 0 && !plants.error ? (
        <EmptyState title="Add a plant first" action={<Link to="/garden" className="rounded-full bg-moss px-5 py-2.5 font-semibold text-white">Go to your garden</Link>}>
          Journal entries belong to a plant, so you can see how each one changes.
        </EmptyState>
      ) : (
        <>
          <EntryForm plants={plantList} onSaved={entries.reload} />
          <div className="flex items-center gap-2">
            <label htmlFor="journal-filter" className="text-sm font-semibold">Show</label>
            <select id="journal-filter" className="input max-w-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All plants</option>
              {plantList.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          {entries.error && <Notice tone="error" error={entries.error} />}
          {entries.data && entries.data.length === 0 && (
            <EmptyState title="No observations yet">Go outside, look closely at a plant, and write down one thing you notice.</EmptyState>
          )}
          {entries.data && entries.data.length > 0 && <EntryList entries={entries.data} />}
        </>
      )}
    </div>
  );
}
