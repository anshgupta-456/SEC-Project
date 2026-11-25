"""Reference data every installation needs."""
from shared.constants import COMMITTEE_DISPLAY_NAMES
from shared.models.commitee_model import Committee
from shared.utils.db_utils import db


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
