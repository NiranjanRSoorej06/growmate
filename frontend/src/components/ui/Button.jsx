const VARIANTS = {
  primary: "bg-moss text-white hover:bg-moss-dark disabled:bg-moss/50",
  sprout: "bg-sprout text-ink hover:bg-sprout-dark disabled:opacity-50",
  quiet: "bg-white text-ink ring-1 ring-ink/20 hover:bg-ink/5 disabled:opacity-50",
  danger: "bg-white text-rust ring-1 ring-rust/40 hover:bg-rust/10 disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}) {
  const sizing = size === "sm" ? "px-3.5 py-1.5 text-sm" : "px-5 py-2.5 text-base";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed ${sizing} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
