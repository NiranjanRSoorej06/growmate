# Architecture

```text
React + Vite  ──HTTP/JSON──▶  FastAPI  ──▶  Ollama + Gemma   (local inference)
 (Tailwind)                      │     └──▶  SQLite           (garden, plants, tasks, journal)
                                 └────────▶  Open-Meteo / SerpApi  (optional, internet)
```

## Backend layout

| Path | Responsibility |
|---|---|
| `app/main.py` | App factory, CORS, uniform error handlers, Sentry start-up |
| `app/api/routes/` | HTTP only: parse, call a repository or service, return |
| `app/schemas/` | Pydantic models for requests, responses, and model output |
| `app/db/` | SQLite schema (`database.py`) and all SQL (`repositories.py`) |
| `app/services/ollama_service.py` | Talks to Ollama. Checks the model exists, applies timeouts, raises `AIServiceError` |
| `app/services/gardening_service.py` | Prompts, catalog filtering, JSON extraction and validation |
| `app/services/weather_service.py` | Open-Meteo lookup and rule-based advice |
| `app/services/search_service.py` | SerpApi lookup |
| `app/prompts/gardener.txt` | System prompt |

## Request flow: planting plan

1. React posts `{garden_id, budget, max_plants}` to `/ai/planting-plan`.
2. FastAPI validates the body, loads the garden from SQLite.
3. Optionally, it fetches weather. If that fails, the plan continues without it.
4. `gardening_service` selects catalog plants that fit the garden's sunlight, space and container needs,
   and builds a prompt.
5. `ollama_service` verifies Ollama is up and the model is pulled, then calls `/api/chat` with `format: json`.
6. The reply is parsed and validated against `LLMPlan`. If it is invalid, **one** retry asks the model to fix it.
   If it is still invalid, the API returns `502 ai_bad_response`.
7. The API caps the list at `max_plants`, flags catalog matches, stores the plan, and returns it.
8. The user reviews the plan and chooses what to save as plants and tasks. Nothing is saved automatically.

## Design decisions

- **One database.** SQLite with a repository layer. Swap it later without touching routes.
- **Single garden.** The MVP has one garden profile (`garden_001`) and no accounts.
  Add authentication before storing private data for several users.
- **AI output is untrusted.** It is validated, length-capped, and normalised. Uncertain diagnoses always carry
  `requires_verification: true`.
- **Garden text is data.** User-supplied fields sit in a labelled "Garden context" block, and the system prompt
  tells the model not to treat them as instructions.
- **Optional services fail separately.** A weather or research failure never affects plants, tasks, or chat.
- **Search snippets** are returned to the user as links with a warning. They are not fed to the model.

## Privacy and deployment

- Ollama runs on the machine hosting the backend. Prompts stay on that machine.
  This does **not** make a publicly hosted deployment private.
- Never expose Ollama's port to the internet. `docker-compose.yml` does not publish it.
- Weather (Open-Meteo) and research (SerpApi) send the garden location or your query to those services.
  The app is **not** fully offline when they are enabled.
- Secrets live in environment variables (`.env`), never in source control.
- A hosted deployment needs a machine that can run the model, or a separate inference endpoint.
  A basic web service tier usually cannot.

## Monitoring

- Backend: set `SENTRY_DSN` and errors and traces are reported. Handled AI errors (503/504/502) are returned
  to the client as normal responses.
- Frontend: set `VITE_SENTRY_DSN` at build time.
