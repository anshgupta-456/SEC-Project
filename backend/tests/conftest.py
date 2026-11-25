import os
import sys
import tempfile
from pathlib import Path

import pytest

# Configure before any project module reads the environment.
_tmp_dir = tempfile.mkdtemp(prefix="grievance-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp_dir, 'test.db').as_posix()}"
os.environ["ENABLE_ML_CLASSIFIER"] = "false"
os.environ["GEMINI_API_KEY"] = ""
os.environ["JWT_SECRET"] = "test-secret-that-is-long-enough-for-hs256-signing"

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.app_factory import create_app  # noqa: E402
from shared.seed import seed_committees  # noqa: E402
from shared.utils.db_utils import db  # noqa: E402


@pytest.fixture()
def apps():
    from admin_app.routes.admin_routes import admin_bp
    from grievance_app.routes.grievance_routes import grievance_bp
    from user_app.routes.user_routes import user_bp

    user_app = create_app("user_app", user_bp, {"TESTING": True})
    grievance_app = create_app("grievance_app", grievance_bp, {"TESTING": True})
    admin_app = create_app("admin_app", admin_bp, {"TESTING": True})

    with user_app.app_context():
        db.drop_all()
        db.create_all()
        seed_committees()

    yield {"user": user_app, "grievance": grievance_app, "admin": admin_app}

    for app in (user_app, grievance_app, admin_app):
        with app.app_context():
            db.session.remove()
            db.engine.dispose()


@pytest.fixture()
def clients(apps):
    return {name: app.test_client() for name, app in apps.items()}


STUDENT = {
    "full_name": "Asha Verma",
    "email": "asha@example.edu",
    "phone": "9999999999",
    "department": "Computer Science",
    "year": "3",
    "student_id": "CS2023001",
    "password": "secret123",
}


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def student(clients):
    res = clients["user"].post("/signup", json=STUDENT)
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    return {"token": body["token"], "user": body["user"]}


@pytest.fixture()
def make_admin(apps, clients):
    def _make(email="admin@example.edu", c_id=None, password="adminpass"):
        from admin_app.services.admin_service import AdminService

        with apps["admin"].app_context():
            admin = AdminService.create_admin("Admin User", email, password, c_id=c_id)
            admin_id = admin.admin_id
        res = clients["admin"].post("/login", json={"admin_id": str(admin_id), "password": password})
        assert res.status_code == 200, res.get_json()
        return {"token": res.get_json()["token"], "admin_id": admin_id}

    return _make
