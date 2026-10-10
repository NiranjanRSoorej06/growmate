export const FREQUENCY_LABELS = {
  once: "One time",
  daily: "Every day",
  every_2_days: "Every 2 days",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

export const GARDEN_TYPES = [
  ["balcony", "Balcony"],
  ["backyard", "Backyard"],
  ["rooftop", "Rooftop"],
  ["indoor", "Indoors"],
  ["patio", "Patio"],
  ["community", "Community plot"],
];
export const SUNLIGHT = [
  ["full", "Full sun (6+ hours)"],
  ["partial", "Partial sun (3-6 hours)"],
  ["shade", "Shade (under 3 hours)"],
];
export const EXPERIENCE = [
  ["beginner", "Beginner"],
  ["intermediate", "Some experience"],
  ["advanced", "Experienced"],
];
export const INTERESTS = ["herbs", "vegetables", "flowers", "fruits", "ornamentals"];

// Local date as YYYY-MM-DD (not UTC), to match the user's calendar day.
export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dueLabel(dueDate, today = todayISO()) {
  if (!dueDate) return "No date";
  if (dueDate < today) return "Overdue";
  if (dueDate === today) return "Today";
  const [y, m, d] = dueDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Turns an API error into guidance the user can act on.
export function aiErrorHint(err) {
  switch (err?.code) {
    case "ai_unavailable":
      return "Start Ollama on the machine running GrowMate (ollama serve), then try again.";
    case "model_not_found":
      return "Download the model once with: ollama pull gemma3:4b";
    case "ai_timeout":
      return "The model is slow on this machine. Try again, or switch to a smaller model.";
    case "ai_bad_response":
      return "The model answered in a format GrowMate couldn't read. Trying again usually works.";
    default:
      return null;
  }
}
