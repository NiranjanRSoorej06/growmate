import { useId } from "react";

// Wraps a control with a visible label and an inline error message.
export default function Field({ label, error, hint, children, className = "" }) {
  const id = useId();
  const control =
    children && typeof children === "object" && "props" in children
      ? { ...children, props: { ...children.props, id, "aria-invalid": error ? true : undefined } }
      : children;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {control}
      {hint && !error && <p className="mt-1 text-sm text-ink/60">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
