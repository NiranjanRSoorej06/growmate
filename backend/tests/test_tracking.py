from datetime import date, timedelta


def test_plant_crud(client):
    res = client.post("/api/v1/plants", json={"name": "  Tulsi  ", "category": "herbs"})
    assert res.status_code == 201
    pid = res.json()["id"]
    assert res.json()["name"] == "Tulsi"
    assert client.get(f"/api/v1/plants/{pid}").json()["category"] == "herbs"
    assert len(client.get("/api/v1/plants").json()) == 1
    assert client.delete(f"/api/v1/plants/{pid}").status_code == 204
    assert client.get(f"/api/v1/plants/{pid}").status_code == 404


def test_plant_validation(client):
    assert client.post("/api/v1/plants", json={"name": "   "}).status_code == 422


def test_task_lifecycle(client, plant):
    res = client.post("/api/v1/tasks", json={"title": "Water once", "plant_id": plant["id"]})
    assert res.status_code == 201
    task = res.json()
    assert task["completed"] is False
    assert task["plant_name"] == "Green chilli"
    assert task["due_date"] == date.today().isoformat()

    done = client.patch(f"/api/v1/tasks/{task['id']}", json={"completed": True}).json()
    assert done["completed"] is True
    assert done["completed_at"]
    # a one-off task does not come back
    assert client.get("/api/v1/tasks?status=open").json() == []
    assert len(client.get("/api/v1/tasks?status=done").json()) == 1


def test_recurring_task_schedules_next(client, plant):
    task = client.post(
        "/api/v1/tasks",
        json={"title": "Check soil moisture", "frequency": "daily", "plant_id": plant["id"]},
    ).json()
    client.patch(f"/api/v1/tasks/{task['id']}", json={"completed": True})
    open_tasks = client.get("/api/v1/tasks?status=open").json()
    assert len(open_tasks) == 1
    assert open_tasks[0]["due_date"] == (date.today() + timedelta(days=1)).isoformat()

    # Completing twice must not spawn a second copy
    client.patch(f"/api/v1/tasks/{task['id']}", json={"completed": True})
    assert len(client.get("/api/v1/tasks?status=open").json()) == 1


def test_task_for_missing_plant_is_404(client):
    res = client.post("/api/v1/tasks", json={"title": "x", "plant_id": 999})
    assert res.status_code == 404


def test_patch_missing_task_is_404(client):
    assert client.patch("/api/v1/tasks/42", json={"completed": True}).status_code == 404


def test_journal_entries_persist_and_filter(client, plant):
    other = client.post("/api/v1/plants", json={"name": "Mint"}).json()
    client.post(
        "/api/v1/journal",
        json={
            "plant_id": plant["id"],
            "note": "First flowers",
            "height_cm": 22.5,
            "health": "thriving",
        },
    )
    client.post("/api/v1/journal", json={"plant_id": other["id"], "note": "New leaves"})

    all_entries = client.get("/api/v1/journal").json()
    assert len(all_entries) == 2
    only = client.get(f"/api/v1/journal?plant_id={plant['id']}").json()
    assert len(only) == 1
    assert only[0]["note"] == "First flowers"
    assert only[0]["plant_name"] == "Green chilli"
    assert only[0]["height_cm"] == 22.5


def test_journal_requires_existing_plant_and_note(client, plant):
    assert client.post("/api/v1/journal", json={"plant_id": 99, "note": "hi"}).status_code == 404
    assert (
        client.post("/api/v1/journal", json={"plant_id": plant["id"], "note": " "}).status_code
        == 422
    )


def test_deleting_plant_removes_its_tasks_and_entries(client, plant):
    client.post("/api/v1/tasks", json={"title": "Water", "plant_id": plant["id"]})
    client.post("/api/v1/journal", json={"plant_id": plant["id"], "note": "ok"})
    client.delete(f"/api/v1/plants/{plant['id']}")
    assert client.get("/api/v1/tasks").json() == []
    assert client.get("/api/v1/journal").json() == []
