import { useState } from "react";
import Button from "../ui/Button.jsx";
import Field from "../ui/Field.jsx";
import { EXPERIENCE, GARDEN_TYPES, INTERESTS, SUNLIGHT } from "../../services/format.js";

const EMPTY = {
  location: "",
  garden_type: "",
  sunlight: "",
  space_sqm: "",
  experience: "",
  interests: [],
};

export function validate(values) {
  const errors = {};
  if (values.location.trim().length < 2) errors.location = "Enter the town or region where you garden.";
  if (!values.garden_type) errors.garden_type = "Choose where you'll be growing.";
  if (!values.sunlight) errors.sunlight = "Choose how much sun the spot gets.";
  const space = Number(values.space_sqm);
  if (values.space_sqm === "" || Number.isNaN(space) || space <= 0) {
    errors.space_sqm = "Enter the growing area in square metres, more than 0.";
  } else if (space > 10000) {
    errors.space_sqm = "That's larger than 10,000 square metres. Enter a smaller number.";
  }
  if (!values.experience) errors.experience = "Choose your experience level.";
  return errors;
}

export default function GardenForm({ initial, onSave, saving = false }) {
  const [values, setValues] = useState(initial ? { ...EMPTY, ...initial } : EMPTY);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const toggleInterest = (name) =>
    setValues((v) => ({
      ...v,
      interests: v.interests.includes(name) ? v.interests.filter((i) => i !== name) : [...v.interests, name],
    }));

  const submit = (e) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    onSave({
      location: values.location.trim(),
      garden_type: values.garden_type,
      sunlight: values.sunlight,
      space_sqm: Number(values.space_sqm),
      experience: values.experience,
      interests: values.interests,
    });
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label="Location" error={errors.location} className="sm:col-span-2">
        <input className="input" value={values.location} onChange={set("location")} placeholder="Town, state, country" autoComplete="off" />
      </Field>
      <Field label="Garden type" error={errors.garden_type}>
        <select className="input" value={values.garden_type} onChange={set("garden_type")}>
          <option value="">Choose one</option>
          {GARDEN_TYPES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Sunlight" error={errors.sunlight}>
        <select className="input" value={values.sunlight} onChange={set("sunlight")}>
          <option value="">Choose one</option>
          {SUNLIGHT.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <Field label="Growing space (square metres)" error={errors.space_sqm}>
        <input className="input" type="number" inputMode="decimal" min="0" step="0.1" value={values.space_sqm} onChange={set("space_sqm")} />
      </Field>
      <Field label="Experience" error={errors.experience}>
        <select className="input" value={values.experience} onChange={set("experience")}>
          <option value="">Choose one</option>
          {EXPERIENCE.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold">What do you want to grow?</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((name) => {
            const on = values.interests.includes(name);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => toggleInterest(name)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition-colors ${
                  on ? "bg-moss text-white ring-moss" : "bg-white text-ink ring-ink/25 hover:bg-ink/5"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving" : "Save garden"}
        </Button>
      </div>
    </form>
  );
}
