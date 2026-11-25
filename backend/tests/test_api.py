import io

from conftest import STUDENT, auth

WEBM_HEADER = b"\x1a\x45\xdf\xa3" + b"\x00" * 64


def submit(clients, token, **fields):
    data = {"title": "Broken fans", "description": "Fans in room 101 are broken.", "language": "english",
            "committee": "auto"}
    data.update(fields)
    return clients["grievance"].post("/add_grievance", data=data, headers=auth(token),
                                     content_type="multipart/form-data")


# --------------------------------------------------------------------- basics
def test_health_and_json_404(clients):
    assert clients["user"].get("/health").get_json()["status"] == "ok"
    res = clients["admin"].get("/does-not-exist")
    assert res.status_code == 404
    assert "message" in res.get_json()


# ----------------------------------------------------------------------- auth
def test_signup_login_and_validation(clients, student):
    assert student["user"]["student_id"] == STUDENT["student_id"]
    assert student["user"]["u_id"]
    assert "password" not in student["user"]

    dup = clients["user"].post("/signup", json=STUDENT)
    assert dup.status_code == 409

    missing = clients["user"].post("/signup", json={"full_name": "X"})
    assert missing.status_code == 400

    bad = clients["user"].post("/login", json={"student_id": STUDENT["student_id"], "password": "wrong"})
    assert bad.status_code == 401

    good = clients["user"].post("/login", json={"student_id": STUDENT["student_id"], "password": STUDENT["password"]})
    assert good.status_code == 200
    assert good.get_json()["token"]


def test_protected_endpoints_require_token(clients, student):
    assert clients["grievance"].get(f"/get_all_grievance/{student['user']['u_id']}").status_code == 401
    bad = clients["user"].get("/me", headers=auth("not-a-token"))
    assert bad.status_code == 401
    assert clients["user"].get("/me", headers=auth(student["token"])).status_code == 200


def test_student_cannot_use_admin_endpoints(clients, student):
    assert clients["admin"].get("/get_all_grievance", headers=auth(student["token"])).status_code == 403


def test_profile_update_and_change_password(clients, student):
    res = clients["user"].put("/update", headers=auth(student["token"]),
                              json={"full_name": "Asha V", "email": "asha.v@example.edu", "phone": "123"})
    assert res.status_code == 200
    assert res.get_json()["full_name"] == "Asha V"

    wrong = clients["user"].put("/change_password", headers=auth(student["token"]),
                                json={"current_password": "nope", "new_password": "newpass1"})
    assert wrong.status_code == 400
    ok = clients["user"].put("/change_password", headers=auth(student["token"]),
                             json={"current_password": STUDENT["password"], "new_password": "newpass1"})
    assert ok.status_code == 200
    relogin = clients["user"].post("/login", json={"student_id": STUDENT["student_id"], "password": "newpass1"})
    assert relogin.status_code == 200


# ----------------------------------------------------------------- grievances
def test_submit_without_audio_with_chosen_committee(clients, student):
    res = submit(clients, student["token"], committee="research_facility", title="Lab access")
    assert res.status_code == 201, res.get_json()
    body = res.get_json()
    assert body["c_id"] == 4
    assert body["assigned_by"] == "student"
    assert body["status"] == "Pending"
    assert body["has_audio"] is False


def test_submit_auto_classifies_with_keywords(clients, student):
    res = submit(clients, student["token"], description="The library has no recent journals or textbooks.")
    assert res.status_code == 201
    assert res.get_json()["committee"] == "Journals/Literature"
    assert res.get_json()["assigned_by"] == "keywords"

    hindi = submit(clients, student["token"], language="hindi",
                   description="छात्रवृत्ति की राशि तीन महीने से नहीं मिली है।")
    assert hindi.get_json()["committee"] == "Fellowship"


def test_submit_validation(clients, student):
    assert submit(clients, student["token"], title="").status_code == 400
    assert submit(clients, student["token"], description="  ").status_code == 400
    assert submit(clients, student["token"], language="klingon").status_code == 400


def test_list_own_grievances_only(clients, student):
    submit(clients, student["token"])
    u_id = student["user"]["u_id"]
    res = clients["grievance"].get(f"/get_all_grievance/{u_id}", headers=auth(student["token"]))
    assert res.status_code == 200
    assert len(res.get_json()) == 1
    assert res.get_json()[0]["created_at"].endswith("Z")

    other = clients["grievance"].get(f"/get_all_grievance/{u_id + 1}", headers=auth(student["token"]))
    assert other.status_code == 403


def test_audio_upload_and_access_control(clients, student, make_admin):
    data = {"title": "Voice", "description": "Exam timetable clash", "language": "english", "committee": "auto",
            "audio": (io.BytesIO(WEBM_HEADER), "recording.webm")}
    res = clients["grievance"].post("/add_grievance", data=data, headers=auth(student["token"]),
                                    content_type="multipart/form-data")
    assert res.status_code == 201
    g_id = res.get_json()["id"]
    assert res.get_json()["has_audio"] is True
    assert res.get_json()["committee"] == "Examination"

    audio = clients["grievance"].get(f"/get_audio/{g_id}", headers=auth(student["token"]))
    assert audio.status_code == 200
    assert audio.mimetype == "audio/webm"
    assert audio.data == WEBM_HEADER

    other = clients["user"].post("/signup", json={**STUDENT, "student_id": "CS2", "email": "b@example.edu"})
    denied = clients["grievance"].get(f"/get_audio/{g_id}", headers=auth(other.get_json()["token"]))
    assert denied.status_code == 403

    wrong_committee = make_admin(email="infra@example.edu", c_id=2)
    assert clients["grievance"].get(f"/get_audio/{g_id}", headers=auth(wrong_committee["token"])).status_code == 403
    exam_admin = make_admin(email="exam@example.edu", c_id=1)
    assert clients["grievance"].get(f"/get_audio/{g_id}", headers=auth(exam_admin["token"])).status_code == 200


def test_speech_to_text_rejects_bad_input(clients, student):
    no_file = clients["grievance"].post("/speechToText", data={"language": "english"}, headers=auth(student["token"]))
    assert no_file.status_code == 400
    junk = clients["grievance"].post(
        "/speechToText",
        data={"language": "english", "file": (io.BytesIO(b"not audio"), "audio.wav")},
        headers=auth(student["token"]), content_type="multipart/form-data",
    )
    assert junk.status_code == 422
    assert "message" in junk.get_json()


# ---------------------------------------------------------------------- admin
def test_admin_login_by_id_or_email(clients, make_admin):
    admin = make_admin()
    by_email = clients["admin"].post("/login", json={"admin_id": "ADMIN@example.edu", "password": "adminpass"})
    assert by_email.status_code == 200
    assert by_email.get_json()["user"]["isAdmin"] is True
    assert by_email.get_json()["user"]["committee"] == "All committees"
    bad = clients["admin"].post("/login", json={"admin_id": str(admin["admin_id"]), "password": "x"})
    assert bad.status_code == 401


def test_admin_workflow_status_update_and_scope(clients, student, make_admin):
    exam_id = submit(clients, student["token"], committee="examination").get_json()["id"]
    infra_id = submit(clients, student["token"], committee="infrastructure").get_json()["id"]

    super_admin = make_admin()
    all_rows = clients["admin"].get("/get_all_grievance", headers=auth(super_admin["token"])).get_json()
    assert {row["id"] for row in all_rows} == {exam_id, infra_id}
    assert all_rows[0]["student_name"] == STUDENT["full_name"]

    exam_admin = make_admin(email="exam@example.edu", c_id=1)
    scoped = clients["admin"].get("/get_all_grievance", headers=auth(exam_admin["token"])).get_json()
    assert [row["id"] for row in scoped] == [exam_id]

    forbidden = clients["admin"].put(f"/grievance/{infra_id}/status", headers=auth(exam_admin["token"]),
                                     json={"status": "Resolved"})
    assert forbidden.status_code == 403
    invalid = clients["admin"].put(f"/grievance/{exam_id}/status", headers=auth(exam_admin["token"]),
                                   json={"status": "Done-ish"})
    assert invalid.status_code == 400

    ok = clients["admin"].put(f"/grievance/{exam_id}/status", headers=auth(exam_admin["token"]),
                              json={"status": "resolved", "remarks": "Re-exam scheduled for Monday."})
    assert ok.status_code == 200
    assert ok.get_json()["status"] == "Resolved"

    mine = clients["grievance"].get(f"/get_all_grievance/{student['user']['u_id']}",
                                    headers=auth(student["token"])).get_json()
    resolved = next(row for row in mine if row["id"] == exam_id)
    assert resolved["remarks"] == "Re-exam scheduled for Monday."


def test_dashboards(clients, student, make_admin):
    submit(clients, student["token"], committee="examination")
    g_id = submit(clients, student["token"], committee="fellowship").get_json()["id"]
    admin = make_admin()
    clients["admin"].put(f"/grievance/{g_id}/status", headers=auth(admin["token"]), json={"status": "Resolved"})

    cards = clients["admin"].get("/get_data_statcard", headers=auth(admin["token"])).get_json()
    by_key = {card["key"]: card for card in cards}
    assert by_key["total"]["value"] == 2
    assert by_key["resolved"]["value"] == 1
    assert by_key["pending"]["value"] == 1

    categories = clients["admin"].get("/grievanceCategory/All Complaints/6", headers=auth(admin["token"])).get_json()
    assert len(categories) == 6
    assert sum(c["complaints"] for c in categories) == 2
    resolved_only = clients["admin"].get("/grievanceCategory/Resolved/0", headers=auth(admin["token"])).get_json()
    assert sum(c["complaints"] for c in resolved_only) == 1

    trend = clients["admin"].get("/get_line_graph_data/6", headers=auth(admin["token"])).get_json()
    assert len(trend) == 6
    assert trend[-1]["totalComplaints"] == 2 and trend[-1]["resolved"] == 1

    kpi = clients["admin"].get("/kpi_report", headers=auth(admin["token"])).get_json()
    assert kpi["resolution_rate"] == 50.0

    u_id = student["user"]["u_id"]
    student_cards = clients["user"].get(f"/get_data_statcard/{u_id}", headers=auth(student["token"])).get_json()
    assert {c["key"]: c["value"] for c in student_cards}["total"] == 2
    student_kpi = clients["user"].get(f"/grievance/kpi_report/{u_id}", headers=auth(student["token"])).get_json()
    assert student_kpi["resolved"] == 1
    assert clients["user"].get(f"/get_data_statcard/{u_id + 5}", headers=auth(student["token"])).status_code == 403


def test_only_all_committee_admin_can_create_admins(clients, make_admin):
    super_admin = make_admin()
    created = clients["admin"].post("/signup", headers=auth(super_admin["token"]),
                                    json={"full_name": "Lib", "email": "lib@example.edu", "password": "libpass1",
                                          "c_id": "journals/literature"})
    assert created.status_code == 201
    assert created.get_json()["c_id"] == 5

    scoped = make_admin(email="scoped@example.edu", c_id=3)
    denied = clients["admin"].post("/signup", headers=auth(scoped["token"]),
                                   json={"full_name": "X", "email": "x@example.edu", "password": "xpass12"})
    assert denied.status_code == 403
