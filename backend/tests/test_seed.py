from shared.models.admin_model import Admin
from shared.seed import bootstrap_admin


def test_bootstrap_admin_creates_once_and_never_resets(apps, clients):
    with apps["admin"].app_context():
        assert bootstrap_admin(email="", password="").startswith("skipped")
        assert bootstrap_admin(email="boss@example.edu", password="").startswith("skipped")
        assert bootstrap_admin(email="boss@example.edu", password="123").startswith("skipped")

        assert bootstrap_admin(email="Boss@Example.edu", password="first-pass", name="Principal").startswith("created")
        # Running again (every deploy) must not create a duplicate or change the password.
        assert bootstrap_admin(email="boss@example.edu", password="other-pass").startswith("exists")
        admins = Admin.query.all()
        assert len(admins) == 1 and admins[0].c_id is None and admins[0].full_name == "Principal"

    ok = clients["admin"].post("/login", json={"admin_id": "boss@example.edu", "password": "first-pass"})
    assert ok.status_code == 200
    stale = clients["admin"].post("/login", json={"admin_id": "boss@example.edu", "password": "other-pass"})
    assert stale.status_code == 401
