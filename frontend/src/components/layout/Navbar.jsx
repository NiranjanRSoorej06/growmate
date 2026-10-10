import { Link } from "react-router-dom";
import { api } from "../../services/api.js";
import { useAsync } from "../../hooks/useAsync.js";

function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#2F5D3A" />
      <path d="M32 52V30" stroke="#BFE05A" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 32C32 21 24 15 14 15c0 11 7 17 18 17Z" fill="#BFE05A" />
      <path d="M32 36c0-9 6-14 16-14 0 9-6 14-16 14Z" fill="#E1EDE2" />
    </svg>
  );
}

export function AIStatus() {
  const { data, loading, error, reload } = useAsync(() => api.health(), []);
  let dot = "bg-ink/30";
  let label = "Checking AI";
  let title = "Checking whether the local model is ready";
  if (!loading) {
    if (error) {
      dot = "bg-rust";
      label = "Server offline";
      title = error.message;
    } else if (data.ai.available && data.ai.model_installed) {
      dot = "bg-moss";
      label = `${data.ai.model} ready`;
      title = data.ai.detail;
    } else {
      dot = "bg-sun";
      label = "AI not ready";
      title = data.ai.detail;
    }
  }
  return (
    <button
      type="button"
      onClick={reload}
      title={`${title} (click to re-check)`}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium ring-1 ring-ink/15 hover:bg-ink/5"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export default function Navbar() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <Link to="/" className="flex items-center gap-2 md:hidden" aria-label="GrowMate home">
        <Logo />
        <span className="font-display text-xl font-bold">GrowMate</span>
      </Link>
      <div className="hidden text-sm text-ink/70 md:block">Less screen, more soil.</div>
      <AIStatus />
    </header>
  );
}
