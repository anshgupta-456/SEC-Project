"""Admin service: login, grievance management and dashboards (port 5002)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from admin_app.routes.admin_routes import admin_bp  # noqa: E402
from config import config  # noqa: E402
from shared.app_factory import create_app  # noqa: E402

app = create_app("admin_app", admin_bp)

if __name__ == '__main__':
    app.run(host=config.HOST, port=config.ADMIN_SERVICE_PORT, debug=config.FLASK_DEBUG)
