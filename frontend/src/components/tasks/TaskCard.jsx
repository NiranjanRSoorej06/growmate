import { FREQUENCY_LABELS, dueLabel } from "../../services/format.js";
import Button from "../ui/Button.jsx";

export default function TaskCard({ task, onToggle, onDelete, today }) {
  const due = dueLabel(task.due_date, today);
  const overdue = !task.completed && due === "Overdue";
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink/10">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`${task.completed ? "Mark not done" : "Mark done"}: ${task.title}`}
        onClick={() => onToggle(task)}
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          task.completed ? "border-moss bg-moss text-white" : "border-ink/40 bg-white hover:border-moss"
        }`}
      >
        {task.completed && (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${task.completed ? "text-ink/50 line-through" : ""}`}>{task.title}</p>
        <p className="mt-0.5 text-sm text-ink/70">
          {task.plant_name ? `${task.plant_name}, ` : ""}
          {FREQUENCY_LABELS[task.frequency] || task.frequency}
          {!task.completed && (
            <>
              {", "}
              <span className={overdue ? "font-semibold text-rust" : ""}>{due}</span>
            </>
          )}
        </p>
      </div>
      {onDelete && (
        <Button variant="quiet" size="sm" aria-label={`Delete task: ${task.title}`} onClick={() => onDelete(task)}>
          Delete
        </Button>
      )}
    </li>
  );
}
