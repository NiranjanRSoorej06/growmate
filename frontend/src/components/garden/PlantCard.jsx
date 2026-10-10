import { Link } from "react-router-dom";
import { formatDate } from "../../services/format.js";

export default function PlantCard({ plant }) {
  return (
    <li>
      <Link
        to={`/plants/${plant.id}`}
        className="block h-full rounded-2xl bg-white p-4 ring-1 ring-ink/10 transition-shadow hover:ring-2 hover:ring-moss"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold">{plant.name}</h3>
          {plant.category && <span className="rounded-full bg-moss-light px-2.5 py-0.5 text-sm text-moss-dark">{plant.category}</span>}
        </div>
        {plant.care_summary && <p className="mt-2 line-clamp-3 text-sm text-ink/75">{plant.care_summary}</p>}
        <p className="mt-2 text-sm text-ink/60">Added {formatDate(plant.planted_on)}</p>
      </Link>
    </li>
  );
}
