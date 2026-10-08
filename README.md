# Typeform Clone — SDE Fullstack Assignment

[![CI](https://github.com/ams0301/typeform-sde-assignment/actions/workflows/ci.yml/badge.svg)](https://github.com/ams0301/typeform-sde-assignment/actions/workflows/ci.yml)

A functional clone of Typeform: a drag-and-drop form builder, a shareable public link, and the signature **one-question-at-a-time** conversational fill experience — with responses, per-question stats, and a thank-you screen.

> Built as a hiring assignment for Scaler AI Labs. This is an educational clone of Typeform's UI/UX; it is not affiliated with Typeform.

## Live demo & repo

- **App:** `http://localhost:3000` after setup (see below)
- **Try the respondent flow:** open any published form's `/to/<slug>` link — seeded forms are ready to fill, no login needed

## Tech stack

| Layer    | Choice                                        |
| -------- | --------------------------------------------- |
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind CSS v4, framer-motion, dnd-kit, sonner) |
| Backend  | Python 3.12+ · FastAPI · Pydantic v2          |
| Database | SQLite via SQLAlchemy 2.x (own schema)        |

## Features

### Core
- **Builder** — add, edit (inline on a live canvas), reorder via drag-and-drop, and delete questions. 8 question types: short text, long text, multiple choice (with multi-select), dropdown, email, number, yes/no, rating. Per-question settings: required toggle, description, placeholder, min/max, character limit, rating max.
- **Form management** — create, rename, duplicate, delete; draft/published status; publish/unpublish with a shareable public link; everything persists in SQLite.
- **Respondent flow** — full-screen one-question-at-a-time with smooth directional transitions, keyboard navigation (Enter/arrows/letters/digits), progress bar, inline validation with shake feedback, thank-you screen with `{{name}}` recall, no login required.
- **Results** — summary tab (per-question choice counts with bars, rating averages + distribution, number min/avg/max, recent text answers) and responses tab (table → full response view, delete). Completion rate and average completion time from partial-response tracking.
- **Typeform experience** — warm palette, wordmark, circular OK button, letter-key chips on choices, toasts, modals, live preview of drafts (`/preview/<id>`), themes (background/text/button colors + font).

### Bonus
- **Logic jumps** — per-choice routing ("if bug → severity question") and unconditional jumps ("after this question go to Q4"). Required questions skipped via logic are correctly exempted at submit time (the client sends the visited `path`).
- **Custom themes** — background/text/button colors, 3 font families, auto-derived readable text colors.
- **CSV export** — per-form `GET /api/forms/<id>/export.csv`.
- **Partial-response tracking** — a `Response` row is created when someone *starts* a form (`POST .../start`), completed on submit; completion rate = completed / started.

### Placeholder ("coming soon")
Templates gallery and integrations in the sidebar (marked *Soon*).

## Architecture

```
frontend/                       Next.js (App Router, all client-rendered)
├─ src/app
│  ├─ page.tsx                  Workspace: form cards, create/rename/duplicate/delete
│  ├─ forms/[id]/edit           Builder (3-pane: content list | live canvas | settings)
│  ├─ forms/[id]/results        Results (summary + responses tabs)
│  ├─ preview/[id]              Draft preview (respondent UI, no data saved)
│  └─ to/[slug]                 Public respondent flow (no auth)
├─ src/components/{builder,respondent,results,home,ui}
└─ src/lib                      api client, shared types, question-type registry
        │  fetch /api/* (Next rewrites → backend, so no CORS in prod)
        ▼
backend/                        FastAPI
├─ app/main.py                  app, CORS, startup: create tables + seed
├─ app/models.py                SQLAlchemy models (see schema below)
├─ app/schemas.py               Pydantic request models
├─ app/validation.py            Per-type server-side answer validation
├─ app/serializers.py           JSON shaping
├─ app/routers/forms.py         Creator-side API (forms, questions, responses, stats, CSV)
├─ app/routers/public.py        Public API (form by slug, start, submit)
└─ app/seed.py                  Seeds 4 demo forms + responses on first run
        ▼
SQLite (data/app.db)
```

**State & saving:** the builder keeps the whole form in React state and **debounces (600 ms) PATCHes** per entity — typing in a question title feels instant and produces one API call, not one per keystroke. Choice edits sync back to the server response so freshly created choices get real ids (needed for logic rules). The respondent flow keeps answers client-side and submits once at the end, reusing the `start` row.

## Database schema

```
creators ─┬─< forms ─┬─< questions ─┬─< choices ──< answer_selections >── answers
          │          │              └────── answers ──────────────────────────┘
          │          └─< responses ──────── answers
          │                     (is_complete=false ⇒ partial)
          └─ (single seeded creator; auth simplified per assignment)
```

| Table              | Key columns |
| ------------------ | ----------- |
| `creators`         | id, name, email (unique) |
| `forms`            | creator_id → creators, title, **slug (unique)**, status (draft/published), welcome_* (3 cols), thank_you_* (2 cols), theme (JSON), settings (JSON), published_at, timestamps |
| `questions`        | form_id → forms, qtype, title, description, required, position, config (JSON: placeholder/min/max/max_rating/multiple_selection/logic/always_jump) |
| `choices`          | question_id → questions, label, position |
| `responses`        | form_id → forms, is_complete, started_at, submitted_at, meta (JSON) |
| `answers`          | response_id → responses, question_id → questions, value — unique(response_id, question_id) |
| `answer_selections`| answer_id → answers, choice_id → choices — unique(answer_id, choice_id) |

Design notes:
- Typed value vs. choice selections are split (`answers.value` / `answer_selections`), so multi-select is a set of joins and stats are simple GROUP BYs.
- `questions.config` holds type-specific settings as JSON — adding a question type doesn't require migrations.
- Logic jumps reference question/choice ids, so reordering never breaks them.
- All relationships cascade on delete; SQLite runs with `PRAGMA foreign_keys=ON`.

## API overview

| Method & path | Purpose |
| ------------- | ------- |
| `GET/POST /api/forms` | List forms (with response counts) · create |
| `GET/PATCH/DELETE /api/forms/{id}` | Detail (with questions) · update meta/theme · delete |
| `POST /api/forms/{id}/duplicate` | Copy form + questions (draft, new slug) |
| `POST /api/forms/{id}/publish` / `unpublish` | Toggle public availability (needs ≥1 question with text) |
| `POST /api/forms/{id}/questions` | Add question (choices as labels) |
| `PATCH/DELETE /api/questions/{id}` | Update (fields, config, choice sync) · delete (renormalizes positions) |
| `PUT /api/forms/{id}/questions/order` | Reorder (full id list) |
| `GET /api/forms/{id}/responses` · `/{rid}` · `DELETE /{rid}` | List · detail · delete |
| `GET /api/forms/{id}/stats` | Per-question aggregates + completion rate + avg time |
| `GET /api/forms/{id}/export.csv` | CSV download |
| `GET /api/public/forms/{slug}` | Public definition (published only, 404 otherwise) |
| `POST /api/public/forms/{slug}/start` | Record a started (partial) response |
| `POST /api/public/forms/{slug}/submit` | Validate + store submission (`path` = shown question ids; required check applies only to those) |

Validation errors return `422 {detail: {answers: [{question_id, message}]}}` with respondent-friendly copy, mirrored client-side for instant feedback.

## Tests

CI (GitHub Actions) runs the backend test suite plus frontend lint/build on every push. Locally:

```bash
cd backend
.venv\Scripts\pip install -r requirements-dev.txt
.venv\Scripts\python -m pytest -q
```

The suite runs against a fresh, seeded SQLite database per session and covers: seed integrity, form/question CRUD and reordering, publish guards, public visibility (404 for drafts), submit validation (bad email / out-of-range number and rating / missing required), the logic-jump `path` exemption for skipped required questions, **logic-reference remapping on form duplication**, stats correctness, CSV output, and partial-response completion tracking.

## Setup

**Prerequisites:** Node 20+, Python 3.12+.

```bash
# 1. Backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt      # Windows   (macOS/Linux: .venv/bin/pip)
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
# → http://127.0.0.1:8000/api/health  {"ok":true}
# First run creates data/app.db and seeds 4 demo forms with responses.

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

The frontend proxies `/api/*` to the backend via a Next.js rewrite (configurable with the `API_URL` env var, default `http://127.0.0.1:8000`).

**Seeded demo data** — 4 forms:
1. **Customer Feedback Survey** (published) — all 8 question types, warm cream theme, 14 responses + 3 partials
2. **Product Hunt Launch** (published) — dark navy theme, multi-select, 9 responses + 1 partial
3. **Team Offsite RSVP** (draft) — clean slate to try the builder
4. **Nimbus Support** (published) — **logic jumps**: the first dropdown routes to bug-severity / feature / billing branches

Delete `backend/data/app.db` to re-seed from scratch.

## Deployment

- **Frontend (Vercel):** import the repo, set root `frontend`, env `API_URL=https://<backend-host>`. The rewrite handles API calls server-side — no CORS issues.
- **Backend (Render/Railway):** FastAPI service, root `backend`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. For a persistent disk, set `DATABASE_URL=sqlite:////<disk-path>/app.db` (the seeder runs on boot). SQLite keeps this a single free-tier service; Postgres would be a config swap (same SQLAlchemy models).

## Assumptions & trade-offs

- **Auth simplified** per the assignment: one seeded creator, no login. `Creator` exists in the schema so adding auth later is additive.
- **Logic + required:** the server can't know which questions a logic-jumped respondent saw, so the client sends `path`; required is enforced only for shown questions. A direct API caller omitting `path` is treated as "everything was shown".
- **Choice editing** syncs by position (update/recreate/delete) to preserve ids referenced by logic rules and stored answers; answers referencing a deleted choice are removed via cascade.
- **Dark mode, file uploads, payments, webhooks, collaboration** are out of scope (assignment placeholders/bonus we deprioritized in favor of polishing the builder + respondent flow).
- The Typeform wordmark is reproduced as part of a visual clone exercise for evaluation only.

## Verifying the flow quickly

1. Home → *Create new form* → add a few question types, drag to reorder, toggle **Required**.
2. **Preview** (top bar) → walk the flow, check keyboard nav.
3. **Publish** → open the share link in an incognito window → submit.
4. **Results** → check summary stats and the new response; **Export CSV**.
5. Open `/to/nimbus-support` → pick "I found a bug" and note you never see the billing/feature questions.
