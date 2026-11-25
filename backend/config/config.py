"""Central configuration for every backend service.

Values come from environment variables, optionally loaded from ``backend/.env``
(see ``backend/.env.example``). Nothing secret is hard-coded here.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


def _bool(name, default=False):
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _int(name, default):
    value = os.getenv(name)
    try:
        return int(value) if value not in (None, "") else default
    except ValueError:
        return default


# --- Database -----------------------------------------------------------------
# Any SQLAlchemy URL works, e.g.
#   mysql+pymysql://USER:PASSWORD@localhost/grievance_management_system_db
# When unset, a local SQLite file is used so the project runs with zero setup.
DEFAULT_SQLITE_PATH = BACKEND_DIR / "instance" / "grievance.db"
connection_string = os.getenv("DATABASE_URL") or f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
MIGRATIONS_DIR = str(BACKEND_DIR / "shared" / "migrations")

# --- Auth ---------------------------------------------------------------------
_DEV_SECRET = "dev-only-insecure-jwt-secret-change-me-in-production"
JWT_SECRET = os.getenv("JWT_SECRET") or _DEV_SECRET
JWT_SECRET_IS_DEFAULT = JWT_SECRET == _DEV_SECRET
JWT_EXPIRY_HOURS = _int("JWT_EXPIRY_HOURS", 24)

# --- Services -----------------------------------------------------------------
HOST = os.getenv("HOST", "127.0.0.1")
USER_SERVICE_PORT = _int("USER_SERVICE_PORT", 5000)
GRIEVANCE_SERVICE_PORT = _int("GRIEVANCE_SERVICE_PORT", 5001)
ADMIN_SERVICE_PORT = _int("ADMIN_SERVICE_PORT", 5002)
FLASK_DEBUG = _bool("FLASK_DEBUG", False)
SQL_ECHO = _bool("SQL_ECHO", False)
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
MAX_UPLOAD_MB = _int("MAX_UPLOAD_MB", 16)

# --- ML / external APIs -------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
# Set to false to skip loading the ~1.6 GB BART model and use keyword matching.
ENABLE_ML_CLASSIFIER = _bool("ENABLE_ML_CLASSIFIER", True)
