"""Student service: signup, login, profile and personal dashboard (port 5000)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import config  # noqa: E402
from shared.app_factory import create_app  # noqa: E402
from user_app.routes.user_routes import user_bp  # noqa: E402

app = create_app("user_app", user_bp)

if __name__ == '__main__':
    app.run(host=config.HOST, port=config.USER_SERVICE_PORT, debug=config.FLASK_DEBUG)
