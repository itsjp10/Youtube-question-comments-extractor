# YouTube Comment Analyzer

Full-stack web app that reads the comments of a YouTube video and surfaces the
**most frequent questions, doubts and problems** the audience is asking.

Paste a video URL → the backend fetches the comments, classifies each one by
intent, groups the semantically-similar doubts together, writes a representative
question per group and ranks them by how many people asked. Every run is stored
in PostgreSQL and browsable from a small dashboard. **No authentication.**

---

## Table of contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Getting a YouTube API key](#getting-a-youtube-api-key)
- [Getting an AI provider key (optional)](#getting-an-ai-provider-key-optional)
- [Installation & running](#installation--running)
- [REST API](#rest-api)
- [Processing pipeline](#processing-pipeline)
- [Project structure](#project-structure)
- [Ideas for a v2](#ideas-for-a-v2)

---

## Architecture

```
┌────────────┐        HTTP/JSON        ┌─────────────────────────────┐
│  React SPA │  ───────────────────▶   │  Express REST API           │
│ (Vite+TS)  │  ◀───────────────────   │  controllers → services     │
└────────────┘                         │                             │
                                       │  ┌───────────────────────┐  │
                                       │  │ youtube.service       │─┼──▶ YouTube Data API v3
                                       │  │ comment-processing    │  │
                                       │  │ ai.service ─ provider  │─┼──▶ OpenAI / Gemini / (local heuristic)
                                       │  │ clustering.service    │  │
                                       │  │ analysis.service      │  │
                                       │  └───────────────────────┘  │
                                       └──────────────┬──────────────┘
                                                      │ Prisma ORM
                                                      ▼
                                             ┌──────────────────┐
                                             │ PostgreSQL 16     │  (Docker)
                                             │ Analysis          │
                                             │ Comment           │
                                             │ FAQCluster        │
                                             └──────────────────┘
```

The analysis runs **synchronously** inside `POST /api/analyses` for this first
version. `analysisService.runAnalysis(id)` is a single HTTP-agnostic method, so
moving it behind a queue (Redis + BullMQ) later only touches the controller.

The AI layer is hidden behind the `AIProvider` interface
(`server/src/providers/ai-provider.interface.ts`). Switching provider is a
one-line `.env` change — nothing else in the app knows which one is active.

---

## Tech stack

| Layer     | Tech                                                             |
| --------- | --------------------------------------------------------------- |
| Frontend  | React 18, Vite, TypeScript, React Router, Axios, Tailwind CSS   |
| Backend   | Node.js, Express, TypeScript, Prisma ORM, Zod                   |
| Database  | PostgreSQL 16 (Docker)                                          |
| External  | YouTube Data API v3, optional OpenAI / Google Gemini            |

---

## Requirements

- **Node.js ≥ 18** (fetch, `node:crypto`) — tested on Node 20/24
- **Docker + Docker Compose** (for PostgreSQL)
- A **YouTube Data API v3 key** (free)
- *(optional)* an **OpenAI or Gemini API key** for higher-quality analysis

---

## Environment variables

### `server/.env` (copy from `server/.env.example`)

| Variable                          | Required | Default                          | Notes |
| --------------------------------- | -------- | -------------------------------- | ----- |
| `PORT`                            | no       | `3000`                           | API port |
| `NODE_ENV`                        | no       | `development`                    | |
| `FRONTEND_URL`                    | no       | `http://localhost:5173`          | CORS origin |
| `DATABASE_URL`                    | **yes**  | `postgresql://postgres:postgres@localhost:5432/youtube_analyzer` | matches `docker-compose.yml` |
| `YOUTUBE_API_KEY`                 | **yes**  | –                                | YouTube Data API v3 |
| `AI_PROVIDER`                     | no       | `heuristic`                      | `heuristic` \| `openai` \| `gemini` |
| `AI_API_KEY`                      | if AI    | –                                | required for `openai` / `gemini` |
| `AI_MODEL`                        | no       | provider default                 | e.g. `gpt-4o-mini`, `gemini-1.5-flash` |
| `MAX_COMMENTS_PER_ANALYSIS`       | no       | `1000`                           | hard cap per run |
| `AI_CLASSIFY_BATCH_SIZE`          | no       | `50`                             | comments per classification call |
| `AI_EMBEDDING_BATCH_SIZE`         | no       | `100`                            | texts per embedding call |
| `CLUSTER_SIMILARITY_THRESHOLD`    | no       | `0.82`                           | cosine threshold (semantic providers) |
| `CLUSTER_MIN_POINTS`              | no       | `2`                              | DBSCAN min points per cluster |
| `DUPLICATE_ANALYSIS_WINDOW_HOURS` | no       | `24`                             | recent-duplicate detection window |

> **`AI_PROVIDER=heuristic`** (the default) needs **no AI key**. It uses
> rule-based intent detection + local lexical embeddings, so you can run the
> whole app with only a YouTube key. Set `openai` / `gemini` for real semantic
> quality.

### `client/.env` (copy from `client/.env.example`)

| Variable       | Default                       | Notes                      |
| -------------- | ----------------------------- | -------------------------- |
| `VITE_API_URL` | `http://localhost:3000/api`   | backend base URL (`/api`)  |

---

## Getting a YouTube API key

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or pick one).
3. **APIs & Services → Library →** search **“YouTube Data API v3” → Enable**.
4. **APIs & Services → Credentials → Create credentials → API key**.
5. Copy the key into `server/.env` as `YOUTUBE_API_KEY=...`.
6. *(recommended)* Restrict the key to the *YouTube Data API v3*.

Free quota is 10,000 units/day. A full analysis of a video costs roughly
`1 + ceil(comments / 100)` units.

## Getting an AI provider key (optional)

- **OpenAI** – <https://platform.openai.com/api-keys> · set
  `AI_PROVIDER=openai`, `AI_API_KEY=sk-...`, `AI_MODEL=gpt-4o-mini`.
- **Gemini** – <https://aistudio.google.com/app/apikey> · set
  `AI_PROVIDER=gemini`, `AI_API_KEY=...`, `AI_MODEL=gemini-1.5-flash`.

---

## Installation & running

### 1. Start PostgreSQL (Docker)

```bash
docker compose up -d
```

This starts `postgres:16` on `localhost:5432` with a persistent named volume
(`postgres_data`), database `youtube_analyzer`, user/password `postgres`.

### 2. Backend

```bash
cd server
cp .env.example .env        # then edit YOUTUBE_API_KEY (and AI_* if desired)
npm install
npx prisma migrate dev      # applies the initial migration + generates the client
npm run dev                  # http://localhost:3000
```

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev                  # http://localhost:5173
```

Open <http://localhost:5173>, paste a YouTube URL, and hit **Analizar comentarios**.

### Useful scripts

| Location | Command                | Does |
| -------- | ---------------------- | ---- |
| server   | `npm run dev`          | API with hot reload (tsx) |
| server   | `npm run build && npm start` | compile + run from `dist/` |
| server   | `npm run typecheck`    | `tsc --noEmit` |
| server   | `npx prisma studio`    | browse the DB |
| client   | `npm run dev`          | Vite dev server |
| client   | `npm run build`        | type-check + production build |

---

## REST API

Base URL: `http://localhost:3000/api`

Every response uses one of:

```jsonc
{ "success": true,  "data": { /* ... */ }, "meta": { /* pagination, optional */ } }
{ "success": false, "error": { "message": "YouTube comments are disabled for this video" } }
```

### `POST /api/analyses`

Body: `{ "videoUrl": "https://www.youtube.com/watch?v=...", "force": false }`

- Validates the URL and extracts the video id.
- If the same video was analysed within `DUPLICATE_ANALYSIS_WINDOW_HOURS` and
  `force` is not `true`, responds **without** running a new analysis:

  ```json
  { "success": true, "data": {
    "duplicate": true,
    "previousAnalysis": { "id": "...", "createdAt": "...", "videoTitle": "..." },
    "analysis": null
  } }
  ```

- Otherwise it creates the `Analysis` row, runs the full pipeline synchronously
  and returns `data.analysis` with the video metadata, stats and ranked FAQs
  (HTTP `201`). `data.previousAnalysis` is still included if an older run existed.

### `GET /api/analyses?page=1&limit=20`

History, newest first. `data` is the array; `meta` carries
`{ page, limit, total, totalPages }`.

### `GET /api/analyses/:id`

The stored analysis — video metadata, stats, FAQs and the comments behind each
FAQ. **Never re-calls YouTube or the AI provider.**

### `DELETE /api/analyses/:id`

Deletes the analysis; related `Comment` and `FAQCluster` rows are removed via
`onDelete: Cascade`.

### `GET /api/dashboard/stats`

`{ totalAnalyses, videosAnalyzed, commentsProcessed, relevantCommentsProcessed, faqsDetected, byStatus }`

### `GET /api/health`

Liveness probe.

---

## Processing pipeline

`server/src/services/` — one responsibility each:

```
raw comments (youtube.service)
   ↓  clean + de-duplicate            comment-processing.service
   ↓  intent classification (batched) ai.service → AIProvider
   ↓  keep QUESTION / PROBLEM / REQUEST
   ↓  embeddings (batched)            ai.service → AIProvider
   ↓  DBSCAN over cosine similarity   clustering.service
   ↓  representative question / group ai.service → AIProvider
   ↓  score = frequency + normalizedLikes, ranked desc
FAQ clusters  → persisted by analysis.service
```

Intent categories: `QUESTION`, `PROBLEM`, `REQUEST`, `OPINION`, `THANKS`,
`SPAM`, `OTHER`. A comment such as *“No entendí cómo actualizar los datos”* is
detected as `PROBLEM` even though it has no `?`.

Cluster score is intentionally simple and lives in `server/src/utils/ranking.ts`:

```
score = frequency + round(log10(1 + totalLikes) * 4)
```

`frequency` (number of semantically-similar comments) dominates; likes are a
small saturating bonus.

---

## Project structure

```
youtube-comment-analyzer/
├── docker-compose.yml              # PostgreSQL 16 + persistent volume
├── README.md
├── client/                         # React + Vite + TS
│   ├── .env.example
│   └── src/
│       ├── components/             # Sidebar, PageHeader, VideoUrlForm, VideoSummary,
│       │                           # StatsCards, FAQCard, FAQList, AnalysisHistoryTable,
│       │                           # LoadingAnalysis, EmptyState, ErrorState,
│       │                           # ConfirmDeleteModal, StatusBadge, Spinner
│       ├── pages/                  # DashboardPage, HistoryPage, AnalysisDetailPage
│       ├── layouts/                # AppLayout (sidebar + responsive mobile menu)
│       ├── hooks/                  # useAsync, useAnalyses, useDashboardStats
│       ├── services/               # api.ts (Axios client + error normalisation)
│       ├── lib/                    # format, youtube url, classification styles
│       ├── types/                  # shared DTO types
│       ├── App.tsx
│       └── main.tsx
└── server/                         # Express + TS
    ├── .env.example
    ├── prisma/
    │   ├── schema.prisma           # Analysis, Comment, FAQCluster (+ enums)
    │   └── migrations/             # initial migration
    └── src/
        ├── config/                 # env.ts (Zod-validated config)
        ├── lib/                    # prisma.ts (shared client)
        ├── controllers/            # analysis.controller, dashboard.controller (thin)
        ├── routes/                 # analysis.routes, dashboard.routes, index
        ├── services/               # youtube, comment-processing, ai, clustering, analysis
        ├── providers/              # ai-provider.interface + heuristic / openai / gemini + factory
        ├── middleware/             # validate (Zod), error-handler, not-found
        ├── utils/                  # api-error, async-handler, response, youtube-url,
        │                           # text, concurrency, ranking
        ├── types/
        ├── app.ts
        └── server.ts
```

---

## Ideas for a v2

- **Background jobs** – move `runAnalysis` behind Redis + BullMQ, stream real
  progress to the UI over SSE/WebSocket instead of the simulated stages.
- **Better clustering** – HDBSCAN or agglomerative clustering with automatic
  threshold selection; cache embeddings per comment hash to avoid re-embedding.
- **Replies & pagination of comments** – analyse comment replies; incremental
  re-analysis when a video gets new comments.
- **Provider improvements** – a local embedding model (e.g. `@xenova/transformers`)
  as a zero-cost semantic option; function-calling / JSON-schema responses for
  stricter classification output.
- **Auth & multi-tenant** – users, API-key management, per-user quotas and rate
  limiting.
- **Testing & CI** – unit tests for the pipeline (fixtures of comment sets),
  contract tests for the providers, GitHub Actions.
- **Observability** – structured logging, request tracing, YouTube quota metering.
- **UX** – export FAQs (CSV / Markdown), share links, search & filters in the
  history, dark mode.
```
