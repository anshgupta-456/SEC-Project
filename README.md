# Grievance Hub

An institutional grievance redressal system. Students raise a grievance by typing it or **speaking it in English, Hindi, Marathi or Gujarati**; it is classified and routed to the right committee; committee admins update its status and reply; students follow it to resolution.

<p>
  <img src="docs/screenshots/login.jpg" width="49%" alt="Sign-in screen" />
  <img src="docs/screenshots/student-grievances.jpg" width="49%" alt="Student's grievance list" />
</p>
<p>
  <img src="docs/screenshots/admin-desk.jpg" width="49%" alt="Committee admin desk" />
  <img src="docs/screenshots/admin-reports.jpg" width="49%" alt="Committee reports" />
</p>

---

## Demo login

Admin account for the deployed demo (all committees). Sign in on the **Committee admin** tab:

| Role | Admin ID / email | Password |
|---|---|---|
| Admin (all committees) | `admin@gmail.com` | `admin123` |

Students don't need a pre-made account: use **Create an account** on the sign-in page.

> This login is public. Use the demo with test data only, and change the password in **Settings → Password** (or remove this section) before real students use the site.

---

## Contents

- [Demo login](#demo-login)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Run it locally](#run-it-locally)
- [Configuration](#configuration)
- [Deploying](#deploying)
- [Project structure](#project-structure)
- [API reference](#api-reference)
- [Tests](#tests)

---

## Features

**Students**
- Register and sign in (hashed passwords, JWT sessions)
- Raise a grievance with an optional **voice note**; speech is transcribed into the description (Google Speech Recognition)
- Choose a committee or let the system route it automatically
- Follow each grievance's status and read the committee's response
- Overview with status breakdown, resolution rate and typical resolution time
- Edit contact details, change password, set a preferred language

**Committee admins**
- Admins are scoped to **one committee**, or to **all committees**
- Filter, search and page through grievances; play voice notes
- Set status (**Pending → In Progress → Resolved / Rejected**) and write a response the student sees
- Reports: totals, monthly filed-vs-resolved trend, per-committee volume, resolution KPIs
- Export grievances or reports as CSV

**Classification**
- Uses the `facebook/bart-large-mnli` zero-shot model when installed (`requirements-ml.txt`)
- Otherwise falls back to a built-in keyword classifier (English and Hindi), so submissions always work
- Non-English text is translated with Google Gemini first, when `GEMINI_API_KEY` is set

Committees: Examination, Infrastructure, General Facility, Research Facility, Journals/Literature, Fellowship.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, React Router 7, MUI 7 (custom theme), Recharts, react-hook-form |
| Backend | Python 3.12+, Flask 3, Flask-SQLAlchemy, Flask-Migrate (Alembic), PyJWT |
| Database | SQLite (zero-config default), MySQL 8 or PostgreSQL via `DATABASE_URL` |
| AI / speech | SpeechRecognition (Google), optional Transformers + PyTorch, optional Gemini |
| Deployment | Docker (gunicorn), docker-compose with MySQL, Render blueprint, Vercel/Netlify for a split frontend |

The backend is three Flask services sharing one database and one JWT secret:

| Service | Dev port | Prefix in production | Responsibility |
|---|---|---|---|
| `user_app` | 5000 | `/api/user` | student accounts, profile, student dashboard |
| `grievance_app` | 5001 | `/api/grievance` | submit/list grievances, audio, speech-to-text, classification |
| `admin_app` | 5002 | `/api/admin` | admin login, grievance management, reports |

In development `apprunner.py` starts them as three processes. In production `wsgi.py` mounts all three in **one** process under `/api/...` and also serves the built frontend.

---

## Run it locally

Prerequisites: **Python 3.12+** and **Node.js 18+**. No database server is needed (SQLite is used by default).

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
pip install -r requirements.txt
cp .env.example .env           # Windows: copy .env.example .env  — then set JWT_SECRET
python apprunner.py            # migrates + seeds the DB, starts :5000 :5001 :5002
```

Create a committee admin (in another terminal, with the venv active):

```bash
cd backend
python manage.py create-admin                                   # interactive
python manage.py create-admin --name "Exam Cell" --email exam@college.edu --committee examination
```

Omit `--committee` to create an admin who sees every committee. Admins sign in with their **Admin ID or email**.

### 2. Frontend

```bash
npm install
npm run dev                    # http://localhost:5173
```

Vite proxies `/api/user`, `/api/grievance` and `/api/admin` to the three services, so no CORS setup is needed.

### Optional: the AI classifier

```bash
pip install -r requirements-ml.txt   # PyTorch + Transformers; ~1.6 GB model downloads on first use
```

Set `ENABLE_ML_CLASSIFIER=false` to skip it even when installed.

### Using MySQL locally

```sql
CREATE DATABASE grievance_management_system_db;
```

Then set `DATABASE_URL=mysql+pymysql://USER:PASSWORD@localhost/grievance_management_system_db` in `backend/.env` (URL-encode special characters, e.g. `@` → `%40`) and run `python manage.py init-db`.

---

## Configuration

Backend settings come from environment variables or `backend/.env` (see [`backend/.env.example`](backend/.env.example)).

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | SQLite file in `backend/instance/` | SQLAlchemy URL. `postgres://` and `mysql://` URLs from hosting providers are accepted as-is |
| `JWT_SECRET` | insecure dev value | **Required in production.** Generate: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `JWT_EXPIRY_HOURS` | `24` | Session length |
| `APP_ENV` | `development` | `production` makes `wsgi.py` refuse to start without a real `JWT_SECRET` |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins (only matters when the frontend is on another domain) |
| `GEMINI_API_KEY` | empty | Optional translation of non-English grievances before classification |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `ENABLE_ML_CLASSIFIER` | `true` | Use the BART model when installed |
| `MAX_UPLOAD_MB` | `16` | Max request size (voice notes) |
| `PORT` | `8000` | Port for `wsgi.py` / Docker |

Frontend settings (see [`.env.example`](.env.example)): `VITE_API_URL` — leave empty unless the frontend is hosted separately from the backend.

---

## Deploying

The repository ships three ready-made options.

### A. Docker (any VPS) — app + MySQL

```bash
cp .env.docker.example .env      # set MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD, JWT_SECRET
docker compose up -d --build
docker compose exec app python manage.py create-admin
```

The app is served on port 8000 (`APP_PORT` to change). Put it behind a reverse proxy with HTTPS (Caddy, nginx, Traefik) — browsers only allow microphone access on HTTPS or localhost.

The image builds the frontend, runs `manage.py init-db` (migrations + committees) on start, then gunicorn. Add `INSTALL_ML=true` in `.env` to bundle the AI classifier (much larger image).

### B. Render (one click, free tier)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/anshgupta-456/SEC-Project)

[`render.yaml`](render.yaml) creates a Docker web service (API + frontend) and a PostgreSQL database in Singapore, and generates `JWT_SECRET`.

1. Click the button (or **New → Blueprint** in the Render dashboard and pick the repo).
2. Fill in the prompted values:
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — the first admin (all committees), created on the first deploy. Sign in with the email on the *Committee admin* tab.
   - `GEMINI_API_KEY` — optional; leave blank to skip translation.
3. Click **Apply**. The first build takes ~5 minutes; the app is then live at `https://grievance-hub-XXXX.onrender.com`.
4. Add committee-specific admins by signing in as that admin and calling `POST /api/admin/signup`, or from your machine with the database's *External* URL:
   `DATABASE_URL="<external url>" python manage.py create-admin --committee examination ...`

Free-plan notes: the service sleeps after 15 minutes without traffic (the next visit takes ~1 minute to wake), and Render's free PostgreSQL expires 30 days after creation unless upgraded. Pushes to `main` redeploy automatically.

Any Docker host works the same way (Railway, Fly.io, Koyeb...): build the root `Dockerfile` and set `DATABASE_URL` and `JWT_SECRET`.

> Use a managed database (PostgreSQL/MySQL) in production. The SQLite default lives on the container's disk and is lost on redeploy on most platforms.

### C. Frontend on Vercel/Netlify, backend elsewhere

1. Deploy the backend with option A or B (or any Python host: `pip install -r backend/requirements.txt`, then `cd backend && python manage.py init-db && gunicorn wsgi:app`).
2. Set `CORS_ORIGINS=https://your-frontend.vercel.app` on the backend.
3. Deploy the frontend with build command `npm run build`, output directory `dist`, and environment variable `VITE_API_URL=https://your-backend.example.com`. SPA routing is handled by [`vercel.json`](vercel.json) / [`public/_redirects`](public/_redirects).

---

## Project structure

```
├── src/                         React frontend
│   ├── App.jsx                  routes (role-based, auth-guarded)
│   ├── api.js                   fetch wrapper (JWT, /api/<service> URLs)
│   ├── theme.js, styles.css     design tokens, MUI theme, layout styles
│   ├── components/              screens: grievance list, compose form, admin desk, reports...
│   ├── context/usercontext.jsx  session (token + user) persisted in localStorage
│   └── page/loginPage.jsx       sign in / sign up
├── backend/
│   ├── user_app/ grievance_app/ admin_app/   routes → controller → service → view
│   ├── shared/                  models, migrations, auth (JWT), stats, app factory
│   ├── ML_Models/MLmodel.py     speech-to-text, translation, classification
│   ├── config/config.py         all settings (env / .env)
│   ├── apprunner.py             dev: start the three services
│   ├── wsgi.py                  prod: all services + built frontend in one app
│   ├── manage.py                init-db, create-admin
│   └── tests/                   pytest suite
├── Dockerfile, docker-compose.yml, render.yaml, vercel.json
└── docs/
```

---

## API reference

All endpoints except sign-up and login need `Authorization: Bearer <token>` (returned by login/sign-up). Students can only read their own data; admins only see their committee (or all, for an all-committee admin). Errors are JSON: `{"message": "..."}`.

Paths below are relative to the service (`http://127.0.0.1:5000` in dev, `/api/user` in production, and so on).

**User service** (`/api/user`)

| Method | Path | Description |
|---|---|---|
| POST | `/signup` | Register a student → `{token, user}` |
| POST | `/login` | `{student_id, password}` → `{token, user}` |
| GET | `/me` | Current student |
| PUT | `/update` | Update `full_name`, `email`, `phone` |
| PUT | `/change_password` | `{current_password, new_password}` |
| GET | `/get_data_statcard/<u_id>` | Status totals with month-over-month change |
| GET | `/grievance/kpi_report/<u_id>` | Resolution rate and average resolution time |

**Grievance service** (`/api/grievance`)

| Method | Path | Description |
|---|---|---|
| POST | `/add_grievance` | Multipart: `title`, `description`, `language`, `committee` (`auto` or a committee name), optional `audio` file |
| POST | `/speechToText` | Multipart: `file` (WAV), `language` → `{text}` |
| GET | `/get_all_grievance/<u_id>` | The student's grievances, newest first |
| GET | `/get_audio/<g_id>` | Voice note (owner or responsible admin) |

**Admin service** (`/api/admin`)

| Method | Path | Description |
|---|---|---|
| POST | `/login` | `{admin_id, password}` (`admin_id` may be the email) → `{token, user}` |
| POST | `/signup` | Create another admin (all-committee admins only) |
| GET | `/me` · PUT `/update` · PUT `/change_password` | Admin profile |
| GET | `/get_all_grievance` | Grievances in scope, with student details |
| PUT | `/grievance/<g_id>/status` | `{status, remarks}` |
| GET | `/get_data_statcard` | Status totals |
| GET | `/grievanceCategory/<status>/<months>` | Per-committee counts (`All Complaints` or a status; `0` = all time) |
| GET | `/get_line_graph_data/<months>` | Monthly filed vs. resolved |
| GET | `/kpi_report` | Resolution rate and average resolution time |

Every service also exposes `GET /health` (`/api/health` in production).

---

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The suite runs against a temporary SQLite database with the keyword classifier and covers authentication, access control, submissions (with and without audio), classification, the admin workflow, reports, the first-admin bootstrap and the combined production app.

To run it against PostgreSQL or MySQL instead, point `TEST_DATABASE_URL` at an **empty, disposable** database (tables are dropped):

```bash
TEST_DATABASE_URL=postgresql://user:pass@localhost/grievance_test pytest
```

Frontend checks: `npm run lint` and `npm run build`.
