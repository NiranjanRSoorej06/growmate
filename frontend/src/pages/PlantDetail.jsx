import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api.js";
import { useAsync } from "../hooks/useAsync.js";
import { formatDate, todayISO } from "../services/format.js";
import TaskCard from "../components/tasks/TaskCard.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Notice from "../components/ui/Notice.jsx";
import Sparkline from "../components/ui/Sparkline.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import { EntryForm, EntryList } from "./GrowthJournal.jsx";

export default function PlantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const plant = useAsync(() => api.getPlant(id), [id]);
  const tasks = useAsync(() => api.listTasks({ status: "open", plantId: id }), [id]);
  const entries = useAsync(() => api.listJournal({ plantId: id }), [id]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);
  const today = todayISO();

  if (plant.loading && !plant.data && !plant.error) return <Spinner label="Loading plant" />;
  if (plant.error) {
    return (
      <div className="space-y-3">
        <Notice tone="error" error={plant.error} />
        <Link to="/garden" className="font-semibold text-moss underline">Back to your garden</Link>
      </div>
    );
  }

  const p = plant.data;
  const heights = (entries.data || [])
    .filter((e) => e.height_cm != null)
    .slice()
    .reverse()
    .map((e) => ({ label: e.observed_on, value: e.height_cm }));

  const toggle = async (task) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      tasks.reload();
    } catch (e) {
      setError(e);
    }
  };

  const remove = async () => {
    try {
      await api.deletePlant(p.id);
      navigate("/garden");
    } catch (e) {
      setError(e);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/garden" className="text-sm font-semibold text-moss underline">Back to your garden</Link>
      <section className="panel">
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <p className="mt-1 text-ink/70">
          {p.category ? `${p.category}, ` : ""}added {formatDate(p.planted_on)}
        </p>
        {p.care_summary && <p className="mt-3 max-w-prose"><span className="font-semibold">Care: </span>{p.care_summary}</p>}
        {p.notes && <p className="mt-2 max-w-prose text-ink/80">{p.notes}</p>}
        {heights.length >= 2 && <div className="mt-4"><Sparkline points={heights} /></div>}
      </section>

      {error && <Notice tone="error" error={error} />}

      <section aria-labelledby="ptasks-h" className="space-y-3">
        <h2 id="ptasks-h" className="text-2xl font-bold">Tasks for this plant</h2>
        {tasks.data && tasks.data.length === 0 && <p className="text-ink/70">Nothing to do right now. <Link to="/tasks" className="font-semibold text-moss underline">Add a task</Link></p>}
        {tasks.data && tasks.data.length > 0 && (
          <ul className="space-y-2">{tasks.data.map((t) => (<TaskCard key={t.id} task={t} today={today} onToggle={toggle} />))}</ul>
        )}
      </section>

      <section aria-labelledby="pj-h" className="space-y-3">
        <h2 id="pj-h" className="text-2xl font-bold">Growth journal</h2>
        <EntryForm plants={[p]} fixedPlantId={p.id} onSaved={entries.reload} />
        {entries.data && entries.data.length === 0 && <EmptyState title="No observations yet">Write what you see today. It becomes this plant's growth history.</EmptyState>}
        {entries.data && entries.data.length > 0 && <EntryList entries={entries.data} showPlant={false} />}
      </section>

      <section>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Delete {p.name} and its tasks and journal?</span>
            <Button variant="danger" size="sm" onClick={remove}>Yes, delete</Button>
            <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>Keep it</Button>
          </div>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>Delete plant</Button>
        )}
      </section>
    </div>
  );
}
