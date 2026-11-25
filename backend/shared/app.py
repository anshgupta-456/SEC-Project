"""App used by Flask-Migrate (``flask --app shared/app.py db ...``).

Most people never need this directly: ``python manage.py init-db`` applies
migrations and seeds the committees.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.app_factory import create_app  # noqa: E402

app = create_app("migrations")
