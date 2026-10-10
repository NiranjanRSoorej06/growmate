import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useAsync } from "../hooks/useAsync.js";
import { FREQUENCY_LABELS, todayISO } from "../services/format.js";
import TaskCard from "../components/tasks/TaskCard.jsx";
import Button from "../components/ui/Button.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import Field from "../components/ui/Field.jsx";
import Notice from "../components/ui/Notice.jsx";
import Spinner from "../components/ui/Spinner.jsx";

const TABS = [
  ["open", "To do"],
  ["done", "Done"],
  ["all", "All"],
];

export default function GardenTasks() {
  const [tab, setTab] = useState("open");
  const tasks = useAsync(() => api.listTasks({ status: tab }), [tab]);
  const plants = useAsync(() => api.listPlants(), []);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("once");
  const [plantId, setPlantId] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const today = todayISO();

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Describe the task, for example: Water the tulsi.");
      return;
    }
    setFormError(null);
    try {
      await api.createTask({
        title: title.trim(),
        frequency,
        plant_id: plantId ? Number(plantId) : null,
        due_date: dueDate || null,
      });
      setTitle("");
      tasks.reload();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const toggle = async (task) => {
    setActionError(null);
    try {
      await api.updateTask(task.id, { completed: !task.completed });
      tasks.reload();
    } catch (err) {
      setActionError(err);
    }
  };

  const remove = async (task) => {
    setActionError(null);
    try {
      await api.deleteTask(task.id);
      tasks.reload();
    } catch (err) {
      setActionError(err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Garden tasks</h1>

      <form onSubmit={add} noValidate className="panel grid gap-3 sm:grid-cols-6">
        <Field label="New task" error={formError} className="sm:col-span-6">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Water the tulsi" maxLength={120} />
        </Field>
        <Field label="Repeats" className="sm:col-span-2">
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
          </select>
        </Field>
        <Field label="Plant" className="sm:col-span-2">
          <select className="input" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
            <option value="">Whole garden</option>
            {(plants.data || []).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </Field>
        <Field label="Due" className="sm:col-span-2">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-6"><Button type="submit">Add task</Button></div>
      </form>

      <div role="tablist" aria-label="Task filter" className="flex gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ${tab === v ? "bg-moss text-white ring-moss" : "bg-white ring-ink/25 hover:bg-ink/5"}`}>
            {l}
          </button>
        ))}
      </div>

      {actionError && <Notice tone="error" error={actionError} />}
      {tasks.error && <Notice tone="error" error={tasks.error} action={<Button size="sm" variant="quiet" onClick={tasks.reload}>Try again</Button>} />}
      {tasks.loading && !tasks.data && <Spinner label="Loading tasks" />}
      {tasks.data && tasks.data.length === 0 && (
        <EmptyState
          title={tab === "done" ? "Nothing finished yet" : "No tasks to do"}
          action={tab !== "done" && <Link to="/garden" className="rounded-full bg-moss px-5 py-2.5 font-semibold text-white">Get a planting plan</Link>}
        >
          {tab === "done" ? "Completed tasks will show up here." : "Add one above, or generate a plan to get care tasks for each plant."}
        </EmptyState>
      )}
      {tasks.data && tasks.data.length > 0 && (
        <ul className="space-y-2">
          {tasks.data.map((t) => (<TaskCard key={t.id} task={t} today={today} onToggle={toggle} onDelete={remove} />))}
        </ul>
      )}
    </div>
  );
}
