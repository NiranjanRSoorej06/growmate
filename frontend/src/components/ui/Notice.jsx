import { aiErrorHint } from "../../services/format.js";

const TONES = {
  error: "bg-rust/10 text-rust ring-rust/30",
  info: "bg-mist text-ink ring-ink/10",
  warn: "bg-sun/15 text-ink ring-sun/40",
};

export default function Notice({ tone = "info", children, error, action }) {
  const hint = error ? aiErrorHint(error) : null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex flex-wrap items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ${TONES[tone]}`}
    >
      <div>
        <p className="font-semibold">{error ? error.message : children}</p>
        {hint && <p className="mt-0.5 text-ink/80">{hint}</p>}
        {error && children && <p className="mt-0.5">{children}</p>}
      </div>
      {action}
    </div>
  );
}
