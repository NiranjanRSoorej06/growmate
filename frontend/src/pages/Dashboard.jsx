import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import { useAsync } from "../hooks/useAsync.js";
import { formatDate, todayISO } from "../services/format.js";
import TaskCard from "../components/tasks/TaskCard.jsx";
import Button from "../components/ui/Button.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import Notice from "../components/ui/Notice.jsx";

async function loadDashboard() {
  const [garden, plants, tasks, journal] = await Promise.all([
    api.getGarden(),
    api.listPlants(),
    api.listTasks({ status: "all" }),
    api.listJournal(),
  ]);
  // Weather is a bonus: never let it block the page.
  let weather = null;
  if (garden) {
    try {
      weather = await api.weather();
    } catch {
      weather = null;
    }
  }
  return { garden, plants, tasks, journal, weather };
}

function WeatherPanel({ weather }) {
  if (!weather) return null;
  const today = weather.days[0];
  return (
    <section className="panel" aria-labelledby="weather-h">
      <h2 id="weather-h" className="text-lg font-bold">Outside in {weather.place.split(",")[0]}</h2>
      <p className="mt-1 text-4xl font-bold">{weather.temperature_c != null ? `${Math.round(weather.temperature_c)}°C` : "n/a"}</p>
      {today && (
        <p className="text-sm text-ink/70">
          High {today.temp_max_c != null ? Math.round(today.temp_max_c) : "n/a"}°, low {today.temp_min_c != null ? Math.round(today.temp_min_c) : "n/a"}°
          {today.rain_probability != null ? `, ${today.rain_probability}% chance of rain` : ""}
        </p>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {weather.advice.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink/50">Weather from Open-Meteo, so this panel needs internet.</p>
    </section>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useAsync(loadDashboard, []);
  const today = todayISO();

  if (loading && !data) return <Spinner label="Loading your garden" />;
  if (error)
    return (
      <Notice tone="error" error={error} action={<Button size="sm" variant="quiet" onClick={reload}>Try again</Button>} />
    );

  const { garden, plants, tasks, journal, weather } = data;

  const toggle = async (task) => {
    await api.updateTask(task.id, { completed: !task.completed });
    reload();
  };

  if (!garden) {
    return (
      <section className="rounded-[2rem] bg-sprout p-8 sm:p-12">
        <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">Tell GrowMate about your garden</h1>
        <p className="mt-3 max-w-lg text-lg text-ink/80">
          Add where you grow and how much sun you get. You'll get a planting plan made for your space, and a list of things to do outside.
        </p>
        <Link to="/garden" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 font-semibold text-white hover:bg-ink/85">
          Describe my garden
        </Link>
      </section>
    );
  }

  const due = tasks.filter((t) => !t.completed && t.due_date && t.due_date <= today);
  const upcoming = tasks.filter((t) => !t.completed && (!t.due_date || t.due_date > today));
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const doneThisWeek = tasks.filter((t) => t.completed && t.completed_at && t.completed_at.slice(0, 10) >= todayISO(weekAgo)).length;
  const latest = journal[0];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-[2rem] bg-sprout p-6 sm:p-8 lg:col-span-2" aria-labelledby="today-h">
        <h1 id="today-h" className="text-4xl font-bold leading-tight sm:text-5xl">
          {due.length === 0 ? "Nothing due. Go and look at your plants." : due.length === 1 ? "One thing to do outside today" : `${due.length} things to do outside today`}
        </h1>
        {due.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {due.map((t) => (
              <TaskCard key={t.id} task={t} onToggle={toggle} today={today} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 max-w-lg text-lg text-ink/80">
            {plants.length === 0
              ? "Add your first plant from a planting plan, then tasks will show up here."
              : "Spend ten minutes with them. Check the soil, look under the leaves, and write down what you see."}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/journal" className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white hover:bg-ink/85">
            Write a journal entry
          </Link>
          <Link to="/tasks" className="rounded-full bg-white/70 px-5 py-2.5 font-semibold hover:bg-white">
            All tasks{upcoming.length ? ` (${upcoming.length} coming up)` : ""}
          </Link>
        </div>
      </section>

      <div className="space-y-5">
        <WeatherPanel weather={weather} />
        <section className="panel" aria-labelledby="stats-h">
          <h2 id="stats-h" className="text-lg font-bold">This week</h2>
          <p className="mt-2 text-ink/80">
            <span className="text-3xl font-bold text-ink">{doneThisWeek}</span> tasks finished
          </p>
          <p className="text-ink/80">
            <span className="text-3xl font-bold text-ink">{plants.length}</span> {plants.length === 1 ? "plant" : "plants"} growing
          </p>
        </section>
      </div>

      <section className="panel lg:col-span-3" aria-labelledby="latest-h">
        <h2 id="latest-h" className="text-lg font-bold">Latest observation</h2>
        {latest ? (
          <p className="mt-2 max-w-prose">
            <Link className="font-semibold text-moss underline" to={`/plants/${latest.plant_id}`}>{latest.plant_name}</Link>
            <span className="text-ink/60"> on {formatDate(latest.observed_on)}: </span>
            {latest.note}
          </p>
        ) : (
          <p className="mt-2 text-ink/70">No entries yet. Your first note on a plant starts its growth history.</p>
        )}
      </section>
    </div>
  );
}
