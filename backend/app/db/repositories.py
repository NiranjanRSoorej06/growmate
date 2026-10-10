"""All SQL lives here so routes and services stay free of query strings."""

import json
import sqlite3
from datetime import date, datetime, timedelta

from app.schemas.garden import GardenIn
from app.schemas.journal import JournalIn
from app.schemas.plant import PlantIn
from app.schemas.task import FREQUENCY_DAYS, TaskIn, TaskPatch

GARDEN_ID = "garden_001"


def _now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _today() -> str:
    return date.today().isoformat()


# ---------- garden ----------
def _garden(row: sqlite3.Row) -> dict:
    data = dict(row)
    data["interests"] = json.loads(data["interests"] or "[]")
    return data


def get_garden(conn: sqlite3.Connection, garden_id: str = GARDEN_ID) -> dict | None:
    row = conn.execute("SELECT * FROM gardens WHERE id = ?", (garden_id,)).fetchone()
    return _garden(row) if row else None


def upsert_garden(conn: sqlite3.Connection, data: GardenIn) -> dict:
    conn.execute(
        """
        INSERT INTO gardens (id, location, garden_type, sunlight, space_sqm,
                             experience, interests, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            location = excluded.location,
            garden_type = excluded.garden_type,
            sunlight = excluded.sunlight,
            space_sqm = excluded.space_sqm,
            experience = excluded.experience,
            interests = excluded.interests,
            updated_at = excluded.updated_at
        """,
        (
            GARDEN_ID,
            data.location,
            data.garden_type,
            data.sunlight,
            data.space_sqm,
            data.experience,
            json.dumps(data.interests),
            _now(),
        ),
    )
    conn.commit()
    return get_garden(conn)  # type: ignore[return-value]


# ---------- plants ----------
def create_plant(conn: sqlite3.Connection, data: PlantIn) -> dict:
    cur = conn.execute(
        """
        INSERT INTO plants (name, category, notes, care_summary, source, planted_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data.name,
            data.category,
            data.notes,
            data.care_summary,
            data.source,
            (data.planted_on or date.today()).isoformat(),
            _now(),
        ),
    )
    conn.commit()
    return get_plant(conn, cur.lastrowid)  # type: ignore[return-value]


def get_plant(conn: sqlite3.Connection, plant_id: int) -> dict | None:
    row = conn.execute("SELECT * FROM plants WHERE id = ?", (plant_id,)).fetchone()
    return dict(row) if row else None


def list_plants(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute("SELECT * FROM plants ORDER BY id DESC").fetchall()
    return [dict(r) for r in rows]


def delete_plant(conn: sqlite3.Connection, plant_id: int) -> bool:
    cur = conn.execute("DELETE FROM plants WHERE id = ?", (plant_id,))
    conn.commit()
    return cur.rowcount > 0


# ---------- tasks ----------
_TASK_SELECT = """
SELECT t.*, p.name AS plant_name
FROM tasks t LEFT JOIN plants p ON p.id = t.plant_id
"""


def _task(row: sqlite3.Row) -> dict:
    data = dict(row)
    data["completed"] = bool(data["completed"])
    return data


def get_task(conn: sqlite3.Connection, task_id: int) -> dict | None:
    row = conn.execute(_TASK_SELECT + " WHERE t.id = ?", (task_id,)).fetchone()
    return _task(row) if row else None


def list_tasks(
    conn: sqlite3.Connection, status: str = "all", plant_id: int | None = None
) -> list[dict]:
    clauses, params = [], []
    if status == "open":
        clauses.append("t.completed = 0")
    elif status == "done":
        clauses.append("t.completed = 1")
    if plant_id is not None:
        clauses.append("t.plant_id = ?")
        params.append(plant_id)
    where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    order = """
        ORDER BY t.completed ASC,
                 CASE WHEN t.completed = 0 THEN COALESCE(t.due_date, '9999-12-31') END ASC,
                 t.completed_at DESC,
                 t.id ASC
    """
    rows = conn.execute(_TASK_SELECT + where + order, params).fetchall()
    return [_task(r) for r in rows]


def create_task(conn: sqlite3.Connection, data: TaskIn) -> dict:
    cur = conn.execute(
        """
        INSERT INTO tasks (plant_id, title, frequency, due_date, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data.plant_id,
            data.title,
            data.frequency,
            (data.due_date or date.today()).isoformat(),
            _now(),
        ),
    )
    conn.commit()
    return get_task(conn, cur.lastrowid)  # type: ignore[return-value]


def update_task(conn: sqlite3.Connection, task_id: int, patch: TaskPatch) -> dict | None:
    existing = get_task(conn, task_id)
    if existing is None:
        return None

    fields = patch.model_dump(exclude_unset=True)
    title = fields.get("title", existing["title"])
    due_date = fields.get("due_date", existing["due_date"])
    if isinstance(due_date, date):
        due_date = due_date.isoformat()

    completed = existing["completed"]
    completed_at = existing["completed_at"]
    just_completed = False
    if "completed" in fields and fields["completed"] is not None:
        completed = fields["completed"]
        if completed and not existing["completed"]:
            completed_at = _now()
            just_completed = True
        elif not completed:
            completed_at = None

    conn.execute(
        "UPDATE tasks SET title = ?, due_date = ?, completed = ?, completed_at = ? WHERE id = ?",
        (title, due_date, int(completed), completed_at, task_id),
    )

    # Recurring tasks come back: finishing one schedules the next occurrence.
    interval = FREQUENCY_DAYS.get(existing["frequency"])
    if just_completed and interval:
        conn.execute(
            """
            INSERT INTO tasks (plant_id, title, frequency, due_date, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                existing["plant_id"],
                title,
                existing["frequency"],
                (date.today() + timedelta(days=interval)).isoformat(),
                _now(),
            ),
        )
    conn.commit()
    return get_task(conn, task_id)


def delete_task(conn: sqlite3.Connection, task_id: int) -> bool:
    cur = conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    return cur.rowcount > 0


# ---------- journal ----------
_JOURNAL_SELECT = """
SELECT j.*, p.name AS plant_name
FROM journal j JOIN plants p ON p.id = j.plant_id
"""


def create_entry(conn: sqlite3.Connection, data: JournalIn) -> dict:
    cur = conn.execute(
        """
        INSERT INTO journal (plant_id, note, height_cm, health, observed_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            data.plant_id,
            data.note,
            data.height_cm,
            data.health,
            (data.observed_on or date.today()).isoformat(),
            _now(),
        ),
    )
    conn.commit()
    row = conn.execute(_JOURNAL_SELECT + " WHERE j.id = ?", (cur.lastrowid,)).fetchone()
    return dict(row)


def list_entries(
    conn: sqlite3.Connection, plant_id: int | None = None, limit: int = 200
) -> list[dict]:
    params: list = []
    where = ""
    if plant_id is not None:
        where = " WHERE j.plant_id = ?"
        params.append(plant_id)
    params.append(limit)
    rows = conn.execute(
        _JOURNAL_SELECT + where + " ORDER BY j.observed_on DESC, j.id DESC LIMIT ?", params
    ).fetchall()
    return [dict(r) for r in rows]


# ---------- plans ----------
def save_plan(
    conn: sqlite3.Connection, plan_id: str, garden_id: str, model: str, payload: dict
) -> None:
    conn.execute(
        "INSERT INTO plans (id, garden_id, model, payload, created_at) VALUES (?, ?, ?, ?, ?)",
        (plan_id, garden_id, model, json.dumps(payload), _now()),
    )
    conn.commit()
