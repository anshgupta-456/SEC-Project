"""Grievance service: submit/list grievances, audio, speech-to-text (port 5001)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import config  # noqa: E402
from grievance_app.routes.grievance_routes import grievance_bp  # noqa: E402
from shared.app_factory import create_app  # noqa: E402

app = create_app("grievance_app", grievance_bp)

if __name__ == '__main__':
    app.run(host=config.HOST, port=config.GRIEVANCE_SERVICE_PORT, debug=config.FLASK_DEBUG)
