"""The combined deployment app mounts every service under /api and serves the SPA."""
import importlib

import pytest

from conftest import STUDENT
from shared.seed import seed_committees
from shared.utils.db_utils import db


@pytest.fixture()
def combined(tmp_path, monkeypatch):
    from config import config

    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<!doctype html><title>Grievance Hub</title>")
    (dist / "assets" / "app.js").write_text("console.log('hi')")
    monkeypatch.setattr(config, "STATIC_DIR", dist)

    import wsgi
    wsgi = importlib.reload(wsgi)
    with wsgi.app.app_context():
        db.drop_all()
        db.create_all()
        seed_committees()
    yield wsgi.app.test_client()
    with wsgi.app.app_context():
        db.session.remove()
        db.engine.dispose()


def test_api_is_mounted_under_prefixes(combined):
    assert combined.get("/api/health").get_json()["status"] == "ok"
    signup = combined.post("/api/user/signup", json=STUDENT)
    assert signup.status_code == 201
    token = signup.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = combined.post("/api/grievance/add_grievance", headers=headers, content_type="multipart/form-data",
                            data={"title": "Wifi", "description": "Wifi is down in the library", "committee": "auto"})
    assert created.status_code == 201

    assert combined.get("/api/admin/get_all_grievance", headers=headers).status_code == 403
    assert combined.get("/api/nope").status_code == 404


def test_frontend_and_client_side_routes(combined):
    index = combined.get("/")
    assert index.status_code == 200 and b"Grievance Hub" in index.data
    deep_link = combined.get("/dashboard")
    assert deep_link.status_code == 200 and b"Grievance Hub" in deep_link.data
    asset = combined.get("/assets/app.js")
    assert asset.status_code == 200
    assert "max-age=31536000" in asset.headers["Cache-Control"]
    assert combined.get("/../config/config.py").status_code in (200, 404)  # never the file itself
    assert b"JWT_SECRET" not in combined.get("/../config/config.py").data
