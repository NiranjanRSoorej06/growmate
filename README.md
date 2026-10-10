# GrowMate

A local-first AI gardening companion. Describe your garden, get a planting plan from **Gemma running locally through Ollama**, then turn it into outdoor tasks and a growth journal.

Built for the Hacktoberfest Open-Source AI Challenge, theme **Touch Grass**: less screen time, more time growing things.

## What it does

- Save a garden profile (location, garden type, sunlight, space, experience, interests).
- Generate a personalised planting plan. Each suggestion comes with a reason, care summary and starter tasks.
- Review the plan, then choose which plants and tasks to add. Nothing is saved automatically.
- Ask the AI gardener questions, with follow-ups. Next steps can become tasks in one click.
- Track tasks. Recurring tasks reappear after you complete them.
- Record observations (note, height, health) per plant and see a height trend.
- Optional: weather advice (Open-Meteo) and web sources (SerpApi).
- If Ollama or the model is missing, the app says exactly what to run. Everything else keeps working.

## Quick start

### Prerequisites

- Python 3.11+
- Node.js 20+
- [Ollama](https://ollama.com)

### 1. Get the model

```bash
ollama pull gemma3:4b
ollama run gemma3:4b      # optional: check it runs acceptably on your machine
```

`gemma3:4b` is the default. Use another tag by setting `OLLAMA_MODEL` in `.env`.

### 2. Backend

```bash
cp .env.example .env
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The dev server proxies `/api` to the backend, so no CORS setup is needed.

The pill in the top bar shows whether the model is ready. Click it to re-check.

### Docker alternative

```bash
docker compose up --build                   # uses Ollama running on your host
docker compose --profile ollama up --build  # also runs Ollama in a container
```

Open <http://localhost:8080>. With the `ollama` profile, set `OLLAMA_URL=http://ollama:11434` in `.env` and run `docker compose exec ollama ollama pull gemma3:4b`.

## Configuration

All settings are environment variables, read from `.env` at the repo root. See [`.env.example`](.env.example).

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | Where Ollama runs |
| `OLLAMA_MODEL` | `gemma3:4b` | Model tag |
| `OLLAMA_TIMEOUT` | `120` | Seconds to wait for a reply. Raise on slow CPUs |
| `DATABASE_PATH` | `backend/growmate.db` | SQLite file |
| `SENTRY_DSN` | empty | Enables backend error monitoring |
| `SERPAPI_KEY` | empty | Enables the "Find sources" search |
| `VITE_SENTRY_DSN` | empty | Frontend monitoring (set in `frontend/.env`, at build time) |

## Tests

```bash
cd backend && pip install -r requirements-dev.txt && pytest -q   # 38 tests
cd backend && ruff check . && ruff format --check .
cd frontend && npm test                                            # 9 tests
cd frontend && npm run build
```

The backend tests replace the Ollama call with a fake, so they run without a model. They cover validation, persistence, recurring tasks, malformed model output, unavailable model, missing model and timeouts. CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request.

## Project layout

```text
backend/    FastAPI app, SQLite layer, services, tests
frontend/   React + Vite + Tailwind app, tests
data/       plant_catalog.json (26 plants used to ground suggestions)
docs/       architecture.md, api.md, demo-script.md
```

More detail: [architecture](docs/architecture.md), [API reference](docs/api.md), [demo script](docs/demo-script.md).

## Privacy: what is local and what is not

- **Local:** Gemma inference. Prompts go from the backend to Ollama on the same machine, and your data is stored in a local SQLite file.
- **Needs internet, only if used:** weather (sends your garden's place name to Open-Meteo), "Find sources" (sends your query to SerpApi), Google Fonts in the browser.
- Local inference does not make a **publicly hosted** copy private. Never expose Ollama's port to the internet, and add authentication before storing data for more than one person. This MVP has a single garden and no accounts.

## Known limitations

- Single garden, no user accounts.
- Plan quality depends on the model. Output is validated for shape, not horticultural accuracy. The catalog is small, and suggestions are guidance to check locally, not verified advice.
- Small models can be slow on CPU. A plan may take a minute or more.
- No plant disease detection from photos.
- Optional integrations from the project plan (ElevenLabs, MongoDB, Tiger Data, Mastra, Temporal, TabPFN, Arduino and so on) are **not** implemented. Only Gemma/Ollama, GitHub Actions, optional Sentry hooks, Open-Meteo and SerpApi are present.
- The app is tested against a stand-in Ollama server and mocked responses. Check it with a real model on your machine before demoing.

## Before you submit

This repository is the application. These items from the plan still need you:

- [ ] Run the app with real Gemma and note actual latency and any failures.
- [ ] Do and honestly document a real outdoor trial.
- [ ] Set a real `SENTRY_DSN` and verify an event arrives, if you want to claim Sentry.
- [ ] Record the demo (see `docs/demo-script.md`).
- [ ] Publish the DEV post with `#devchallenge` and `#hf26challenge`, the repo link, setup steps, test results and limitations.
- [ ] Only claim partner technologies you have actually shown working.
