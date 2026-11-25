"""Reference data every installation needs."""
from werkzeug.security import generate_password_hash

from config import config
from shared.constants import COMMITTEE_DISPLAY_NAMES
from shared.models.admin_model import Admin
from shared.models.commitee_model import Committee
from shared.utils.db_utils import db
from shared.utils.http import utcnow

MIN_PASSWORD_LENGTH = 6


def seed_committees():
    """Insert the six committees (c_id 1-6) if they are missing. Idempotent."""
    added = 0
    for c_id, name in COMMITTEE_DISPLAY_NAMES.items():
        committee = db.session.get(Committee, c_id)
        if committee is None:
            db.session.add(Committee(c_id=c_id, c_name=name))
            added += 1
        elif not committee.c_name:
            committee.c_name = name
    db.session.commit()
    return added


def bootstrap_admin(email=None, password=None, name=None):
    """Create an all-committee admin from ADMIN_EMAIL / ADMIN_PASSWORD if missing.

    Returns a short status string for logging. Never modifies an existing admin.
    """
    email = (email if email is not None else config.BOOTSTRAP_ADMIN_EMAIL).strip().lower()
    password = password if password is not None else config.BOOTSTRAP_ADMIN_PASSWORD
    name = name or config.BOOTSTRAP_ADMIN_NAME

    if not email and not password:
        return "skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set)"
    if not email or "@" not in email or not password:
        return "skipped (set both ADMIN_EMAIL and ADMIN_PASSWORD)"
    if Admin.query.filter_by(email=email).first() is not None:
        return f"exists ({email})"
    if len(password) < MIN_PASSWORD_LENGTH:
        return f"skipped (ADMIN_PASSWORD must be at least {MIN_PASSWORD_LENGTH} characters)"

    admin = Admin(
        full_name=name[:100],
        email=email,
        password=generate_password_hash(password),
        c_id=None,
        created_at=utcnow(),
    )
    db.session.add(admin)
    db.session.commit()
    return f"created ({email}, Admin ID {admin.admin_id})"
