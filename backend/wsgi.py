"""Single-process server for deployment.

Mounts all three services in one Flask app and, when the frontend has been
built (``npm run build`` -> ``dist/``), serves it too:

    /api/user/...       student accounts and dashboard
    /api/grievance/...  grievances, audio, speech-to-text
    /api/admin/...      committee admin desk
    /api/health         health check
    /*                  the React app (client-side routes fall back to index.html)

Production:   gunicorn --bind 0.0.0.0:$PORT wsgi:app      (Linux / Docker)
Local check:  python wsgi.py                               (dev server, port 8000)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import abort, send_from_directory  # noqa: E402

from admin_app.routes.admin_routes import admin_bp  # noqa: E402
from config import config  # noqa: E402
from grievance_app.routes.grievance_routes import grievance_bp  # noqa: E402
from shared.app_factory import create_app  # noqa: E402
from user_app.routes.user_routes import user_bp  # noqa: E402

if config.APP_ENV == "production" and config.JWT_SECRET_IS_DEFAULT:
    raise SystemExit(
        "JWT_SECRET must be set when APP_ENV=production. Generate one with:\n"
        "  python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )

app = create_app(
    "grievance_hub",
    blueprints=[(user_bp, "/api/user"), (grievance_bp, "/api/grievance"), (admin_bp, "/api/admin")],
)

STATIC_DIR = config.STATIC_DIR.resolve()
if (STATIC_DIR / "index.html").is_file():
    app.logger.info("Serving frontend from %s", STATIC_DIR)

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def frontend(path):
        if path.startswith("api/"):
            abort(404)
        candidate = (STATIC_DIR / path).resolve()
        if path and candidate.is_file() and STATIC_DIR in candidate.parents:
            # Vite fingerprints everything in /assets, so it can be cached forever.
            max_age = 31536000 if path.startswith("assets/") else 3600
            return send_from_directory(STATIC_DIR, path, max_age=max_age)
        response = send_from_directory(STATIC_DIR, "index.html", max_age=0)
        response.headers["Cache-Control"] = "no-cache"
        return response
else:
    app.logger.info("No built frontend at %s; serving the API only.", STATIC_DIR)


if __name__ == "__main__":
    app.run(host=config.HOST, port=config.PORT, debug=config.FLASK_DEBUG)
