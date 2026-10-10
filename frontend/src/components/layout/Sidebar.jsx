import { NavLink } from "react-router-dom";

const icons = {
  today: "M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  garden: "M12 21v-9m0 0C12 7 9 5 5 5c0 4 2 7 7 7Zm0 2c0-4 3-6 7-6 0 4-2 6-7 6Z",
  ask: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12Z",
  tasks: "M9 11l3 3 8-8M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4",
  journal: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm3 4h7M8 12h7",
};

const ITEMS = [
  { to: "/", label: "Today", icon: "today", end: true },
  { to: "/garden", label: "Garden", icon: "garden" },
  { to: "/ask", label: "Ask", icon: "ask" },
  { to: "/tasks", label: "Tasks", icon: "tasks" },
  { to: "/journal", label: "Journal", icon: "journal" },
];

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

export default function Sidebar() {
  return (
    <>
      {/* Desktop: left rail */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 bg-moss px-3 py-6 text-white md:flex">
        <div className="mb-6 px-3 font-display text-2xl font-bold">GrowMate</div>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold transition-colors ${
                  isActive ? "bg-sprout text-ink" : "text-white/85 hover:bg-white/10"
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-3 text-sm text-white/70">Runs on your machine with Gemma and Ollama.</p>
      </aside>

      {/* Mobile: bottom bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around bg-moss px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-white md:hidden"
      >
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-w-[3.5rem] flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-xs font-semibold ${
                isActive ? "bg-sprout text-ink" : "text-white/85"
              }`
            }
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
