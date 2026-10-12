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

## Deploying to Render

GrowMate is a local-first app: **Gemma runs on your machine through Ollama**, and the
backend and frontend are ordinary containers. For the Hacktoberfest challenge you can
host the web app on Render while keeping Gemma local on your laptop.

### Two tiers, honestly

| Tier | What runs where | AI | Good for |
|---|---|---|---|
| **Local (primary)** | Backend + frontend + Ollama on your laptop | Gemma works (verified: ~2 min per plan on CPU) | The real experience; the one judges should see |
| **Hosted (optional)** | Frontend → Render Static Site, Backend → Render Web Service | AI endpoints return `503 ai_unavailable` — Gemma is not on a Render instance | A public link for judges to try the non-AI features |

### Why Gemma is not in the cloud (yet)

Ollama + Gemma3:4b needs ~2.5-3 GB of RAM just for the model. Render's smallest
Web Service tiers have far less and no GPU, so **running Gemma on a Render instance is
not realistic**. We do **not** silently swap in a proprietary hosted model — that would
break the "open-source AI at its core" premise. The app degrades gracefully: the
backend stays up, garden/tasks/journal/weather all work, and the AI status pill shows
"Gemma not ready" with a clear message.

To get cloud AI you need a separate capable machine (a VPS or a GPU instance) running
`ollama serve` with `gemma3:4b` pulled, then set `OLLAMA_URL` to it on the backend.

### 1. Frontend (Render Static Site)

Build command: `npm run build` (run in `frontend/`) · Publish dir: `frontend/dist`

```bash
VITE_API_URL=https://<your-backend>.onrender.com npm run build
```

`VITE_API_URL` is mandatory for any hosted deployment — Vite bakes it in at build time.
If it is missing in production, the app shows "The API service is not configured for
this site" instead of silently failing. `VITE_SENTRY_DSN` is opt-in.

### 2. Backend (Render Web Service)

Build from `backend/Dockerfile`. Health check: `GET /api/v1/health` (returns 200 even
when Gemma is down, and now reports `sentry_enabled`).

**Required env vars:**

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_PATH` | `/data/growmate.db` | Mount a persistent volume at `/data` (Render's filesystem is ephemeral) |
| `CORS_ORIGINS` | `https://<your-frontend>.onrender.com` | Override the localhost default |
| `OLLAMA_URL` | `http://localhost:11434` | Leave default for local dev; point at your own Ollama host for cloud AI |
| `OLLAMA_TIMEOUT` | `180` | Local Gemma is slow on CPU |
| `SENTRY_DSN` | (set in dashboard) | Opt-in error monitoring |
| `SERPAPI_KEY` | (set in dashboard) | Opt-in web research |

**Also:** set the Web Service to **1 replica** — SQLite is single-writer, and multiple
replicas can corrupt the database.

### 3. Render config (optional)

`render.yaml` is a ready-to-use declarative config with placeholders for both services
(`rootDir: frontend` / `publishDir: dist`, 1 replica, health check `/api/v1/health`, and a
persistent volume at `/data`). Use it, or deploy from the web UI.

### 4. Verify

1. Frontend loads at its URL.
2. `GET /api/v1/health` returns `200` with `status: ok`.
3. Non-AI endpoints work: `PUT /garden`, `GET /tasks`, `GET /journal`.
4. AI status pill shows "Gemma not ready" (expected) or "Gemma ready" if you pointed
   `OLLAMA_URL` at a real Ollama host.
5. Sentry: with `SENTRY_DSN` set, `/health` returns `sentry_enabled: true`.

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
cd backend && pip install -r requirements-dev.txt && pytest -q   # 39 tests
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
