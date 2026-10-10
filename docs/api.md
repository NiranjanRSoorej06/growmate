# GrowMate API

Base URL: `http://localhost:8000/api/v1`. Interactive docs: `http://localhost:8000/docs`.

## Errors

Every error uses the same body:

```json
{ "error": { "code": "ai_unavailable", "message": "Cannot reach Ollama at ...", "details": [] } }
```

`details` appears only for validation errors (`422`) and lists `{ "field", "message" }` pairs.

| Code | Status | Meaning |
|---|---|---|
| `validation_error` | 422 | A field is missing or invalid |
| `http_404` | 404 | Resource not found |
| `ai_unavailable` | 503 | Ollama is not reachable |
| `model_not_found` | 503 | Ollama runs, but the model is not pulled |
| `ai_timeout` | 504 | The model took longer than `OLLAMA_TIMEOUT` |
| `ai_bad_response` | 502 | The model's answer failed schema validation after one retry |
| `ai_error` | 502 | Any other Ollama failure |
| `weather_unavailable`, `location_not_found` | 503, 404 | Open-Meteo problems |
| `research_not_configured`, `research_unavailable` | 503 | SerpApi key missing, or service down |

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | API status plus `ai` readiness (`available`, `model_installed`, `detail`) |
| GET | `/garden` | Fetch the garden profile (404 until saved) |
| PUT | `/garden` | Create or update the profile |
| GET | `/plants` | List plants |
| POST | `/plants` | Add a plant |
| GET | `/plants/{id}` | Plant details |
| DELETE | `/plants/{id}` | Delete a plant, with its tasks and journal entries |
| POST | `/ai/planting-plan` | Generate a plan with Gemma |
| POST | `/ai/chat` | Ask the AI gardener |
| GET | `/tasks?status=open\|done\|all&plant_id=` | List tasks |
| POST | `/tasks` | Create a task |
| PATCH | `/tasks/{id}` | Update title, due date, or completion |
| DELETE | `/tasks/{id}` | Delete a task |
| POST | `/journal` | Add an observation |
| GET | `/journal?plant_id=` | Growth history, newest first |
| GET | `/weather?location=` | Optional. Defaults to the garden's location |
| POST | `/research` | Optional. Needs `SERPAPI_KEY` |

## Garden profile

`PUT /garden`

```json
{
  "location": "Ernakulam, Kerala, India",
  "garden_type": "balcony",
  "sunlight": "partial",
  "space_sqm": 4,
  "experience": "beginner",
  "interests": ["herbs", "vegetables"]
}
```

- `garden_type`: `balcony`, `backyard`, `rooftop`, `indoor`, `patio`, `community`
- `sunlight`: `full`, `partial`, `shade`
- `experience`: `beginner`, `intermediate`, `advanced`
- `space_sqm`: greater than 0, up to 10000

Response: `{ "id": "garden_001", "status": "saved", "recommended_next_step": "generate_planting_plan" }`

## Planting plan

`POST /ai/planting-plan`

```json
{ "garden_id": "garden_001", "season": "current", "budget": 1000, "max_plants": 5, "use_weather": false }
```

Response:

```json
{
  "plan_id": "plan_3fa91c2e",
  "model": "gemma3:4b",
  "recommendations": [
    {
      "plant": "Green chilli",
      "reason": "...",
      "care_summary": "...",
      "tasks": [{ "title": "Check soil moisture", "frequency": "daily" }],
      "from_catalog": true
    }
  ],
  "limitations": ["Verify these suggestions against your local growing conditions."],
  "weather_used": false
}
```

`from_catalog` is `false` when the model suggested a plant that is not in `data/plant_catalog.json`.
Plans are **not** saved to the garden automatically. The user chooses what to add via `/plants` and `/tasks`.

Task `frequency` is one of `once`, `daily`, `every_2_days`, `weekly`, `biweekly`, `monthly`.
Unrecognised values from the model are mapped to `weekly`.

## Chat

`POST /ai/chat`

```json
{
  "garden_id": "garden_001",
  "message": "Why are the leaves on my chilli plant turning yellow?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
}
```

`garden_id` and `history` (max 10 turns) are optional. `message` is 1 to 1000 characters.

Response: `answer`, `possible_causes[]`, `next_steps[]`, `requires_verification`, `model`.
`requires_verification` is forced to `true` whenever `possible_causes` is not empty.

## Tasks

`POST /tasks` takes `{ "title", "frequency"?, "plant_id"?, "due_date"? }`. `due_date` defaults to today.

`PATCH /tasks/{id}` takes any of `{ "title", "completed", "due_date" }`.
Completing a **recurring** task schedules the next occurrence automatically (for example, a daily task
reappears tomorrow). Completing it again does not create a duplicate.

## Journal

`POST /journal` takes `{ "plant_id", "note", "height_cm"?, "health"?, "observed_on"? }` where `health` is
`thriving`, `okay`, or `struggling`.
