# Script Runner — Design Spec

**Date:** 2026-04-05

## Problem / Purpose

A self-hosted tool for writing and scheduling simple JavaScript scripts — scraping pages, pinging APIs, automating fetch-based tasks. Similar in spirit to Yahoo Pipes or Huginn but with a much simpler UX: upload a `.js` file, set a cron schedule, watch it run.

---

## Architecture

A single Node.js process (Express monolith) with three concerns:

1. **HTTP layer** — Express serves the REST API (`/api/*`) and the static frontend from a `public/` build folder
2. **Scheduler** — `node-cron` loads all enabled scripts at startup and registers their cron schedules; dynamically adds/removes jobs when scripts are created/updated/deleted via the API
3. **Runner** — each triggered job spawns a `child_process` to execute the script file, captures stdout/stderr, writes to a log file, and records the run result in SQLite

**Deployment target:** Bare Node.js managed by PM2 (primary), with Docker Compose support added later.

---

## Data Model (SQLite)

### `scripts`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT | user-defined label |
| filename | TEXT | path under `scripts/` dir |
| cron_expression | TEXT | standard 5-field cron |
| enabled | BOOLEAN | whether scheduler registers it |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### `runs`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| script_id | INTEGER FK | |
| type | TEXT | `scheduled` or `test` |
| started_at | DATETIME | |
| finished_at | DATETIME | null while running |
| exit_code | INTEGER | null while running |

### `logs`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| run_id | INTEGER FK | |
| stream | TEXT | `stdout` or `stderr` |
| content | TEXT | line of output |
| created_at | DATETIME | |

---

## npm / Dependencies

Scripts run with the app's shared `node_modules` in scope via `NODE_PATH`. No per-script install step. Users add dependencies to the app's root `package.json` and run `npm install`.

---

## Script Execution Flow

1. A `runs` row is inserted with `started_at` and `type`
2. Child process spawned: `node <script-path>` with shared `NODE_PATH`
3. stdout/stderr streamed to:
   - `logs/<run-id>.log` file on disk
   - `logs` table in SQLite
4. On exit: `runs` row updated with `finished_at` and `exit_code`
5. Non-zero exit or exception = failed run, logged, no notification
6. **Timeout:** configurable max runtime (default 5 min); kills child process on breach, recorded as failed run

---

## Test Runs with Live Output

A "Test" button triggers an immediate run and streams output to the browser in real-time via **Server-Sent Events (SSE)**:

1. `GET /api/scripts/:id/test` — spawns child process, creates `runs` row with `type: 'test'` (GET required for browser `EventSource`)
2. Response is an SSE stream; stdout/stderr lines pushed to client as they arrive
3. Simultaneously written to `logs` table and log file
4. Final SSE event signals completion with exit code
5. Browser renders output line-by-line in a terminal-style panel

---

## UI (React SPA, served by Express)

### Scripts List
- Table: name, cron expression, enabled toggle, last run status + timestamp
- Actions: upload script, edit, delete

### Script Detail
- Settings: name, cron expression, enabled toggle (save button)
- "Test" button → opens live output panel with SSE stream
- "Run Now" button → triggers scheduled-style run (no live stream)
- Paginated run history: type, started_at, duration, exit code

### Run Detail
- Shows full stdout/stderr log output for a single run
- Pulled from DB; for in-progress runs, tails the log file

---

## API Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/scripts` | List all scripts |
| POST | `/api/scripts` | Upload script + metadata |
| GET | `/api/scripts/:id` | Get script detail |
| PUT | `/api/scripts/:id` | Update name/cron/enabled; optionally replace script file |
| DELETE | `/api/scripts/:id` | Delete script + file |
| POST | `/api/scripts/:id/run` | Trigger immediate run |
| GET | `/api/scripts/:id/test` | SSE: test run with live output |
| GET | `/api/scripts/:id/runs` | Paginated run history |
| GET | `/api/runs/:id` | Single run detail |
| GET | `/api/runs/:id/logs` | Logs for a run |

---

## Project Structure

```
/
├── server/
│   ├── index.js          # Express app entry point
│   ├── db.js             # SQLite setup (better-sqlite3)
│   ├── scheduler.js      # node-cron job management
│   ├── runner.js         # child_process execution logic
│   └── routes/
│       ├── scripts.js
│       └── runs.js
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── ScriptList.jsx
│   │   │   ├── ScriptDetail.jsx
│   │   │   └── RunDetail.jsx
│   │   └── components/
│   │       └── LiveOutput.jsx   # SSE terminal panel
├── scripts/              # uploaded .js files stored here
├── logs/                 # per-run log files stored here
├── package.json          # shared deps (server + user scripts)
└── ecosystem.config.js   # PM2 config
```

---

## Key Dependencies

| Package | Purpose |
|---|---|
| `express` | HTTP server |
| `better-sqlite3` | SQLite (sync, simple) |
| `node-cron` | Cron scheduling |
| `multer` | File upload handling |
| `react` + `vite` | Frontend |
| `react-router-dom` | Client-side routing |

---

## Verification

1. Start server: `node server/index.js` (or `pm2 start ecosystem.config.js`)
2. Upload a test script that logs `console.log('hello', new Date())`
3. Set cron to `* * * * *` (every minute), enable it — confirm run appears in history after 1 min
4. Click "Test" — confirm live output streams in the browser terminal panel
5. Upload a script that uses an npm package (e.g. `axios`) — confirm it resolves from shared `node_modules`
6. Upload a script that throws — confirm exit code is non-zero, error appears in logs
7. Set a 10-second timeout, upload an infinite loop script — confirm it's killed and recorded as failed
