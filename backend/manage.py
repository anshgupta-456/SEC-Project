"""Management commands.

    python manage.py init-db        Apply migrations and seed the six committees
    python manage.py create-admin   Create an admin account (prompts for details)

Examples:
    python manage.py create-admin --name "Exam Cell" --email exam@college.edu --committee examination
    python manage.py create-admin --name "Principal" --email principal@college.edu   # all committees
"""
import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import config  # noqa: E402
from shared.app_factory import create_app  # noqa: E402
from shared.constants import COMMITTEE_DISPLAY_NAMES, normalize_committee  # noqa: E402
from shared.seed import bootstrap_admin, seed_committees  # noqa: E402


def init_db(app):
    from flask_migrate import upgrade

    with app.app_context():
        upgrade(directory=config.MIGRATIONS_DIR)
        added = seed_committees()
        admin_status = bootstrap_admin()
    print(f"Database ready ({_safe_url(app)}). Committees added: {added}. Bootstrap admin: {admin_status}.")


def create_admin(app, args):
    from admin_app.services.admin_service import AdminService

    name = args.name or input("Full name: ").strip()
    email = (args.email or input("Email: ").strip()).lower()
    committee = args.committee
    if committee is None and sys.stdin.isatty() and not args.password:
        options = ", ".join(f"{c_id}={n}" for c_id, n in COMMITTEE_DISPLAY_NAMES.items())
        committee = input(f"Committee ({options}; blank = all committees): ").strip() or None

    c_id = None
    if committee not in (None, "", "all"):
        c_id = normalize_committee(committee)
        if c_id is None:
            sys.exit(f"Unknown committee '{committee}'. Use one of: {', '.join(COMMITTEE_DISPLAY_NAMES.values())}")

    password = args.password
    if not password:
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Confirm password: "):
            sys.exit("Passwords do not match.")
    if len(password) < 6:
        sys.exit("Password must be at least 6 characters.")
    if not name or "@" not in email:
        sys.exit("A name and a valid email are required.")

    with app.app_context():
        if AdminService.email_taken(email):
            sys.exit(f"An admin with email {email} already exists.")
        admin = AdminService.create_admin(name, email, password, phone=args.phone, c_id=c_id)
        scope = COMMITTEE_DISPLAY_NAMES[c_id] if c_id else "all committees"
        print(f"Admin created. Log in with Admin ID {admin.admin_id} (or {email}). Scope: {scope}.")


def _safe_url(app):
    from sqlalchemy.engine import make_url

    url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
    if url.get_backend_name() == "sqlite":
        return f"SQLite file {url.database}"
    return url.render_as_string(hide_password=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("init-db", help="apply migrations and seed committees")
    admin = sub.add_parser("create-admin", help="create an admin account")
    admin.add_argument("--name")
    admin.add_argument("--email")
    admin.add_argument("--phone")
    admin.add_argument("--committee", help="committee name or id (omit for all committees)")
    admin.add_argument("--password", help="omit to be prompted (recommended)")
    args = parser.parse_args()

    app = create_app("manage")
    if args.command == "init-db":
        init_db(app)
    elif args.command == "create-admin":
        create_admin(app, args)


if __name__ == "__main__":
    main()
