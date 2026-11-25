from sqlalchemy.dialects.mysql import LONGBLOB
from sqlalchemy.orm import column_property, deferred, relationship

from shared.models.commitee_model import Committee  # noqa: F401  (relationship target)
from shared.models.user_model import User  # noqa: F401  (relationship target)
from shared.utils.db_utils import db
from shared.utils.http import utcnow

# LONGBLOB on MySQL (up to 4 GB), plain BLOB elsewhere (e.g. SQLite).
AudioBlob = db.LargeBinary().with_variant(LONGBLOB(), "mysql")


class Grievance(db.Model):
    __tablename__ = 'grievance'

    g_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    status = db.Column(db.String(50))
    time_stamp = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow)
    title = db.Column(db.String(400))
    desc = db.Column(db.Text)
    # Deferred so listing grievances does not pull every recording into memory.
    audio = deferred(db.Column(AudioBlob))
    language = db.Column(db.String(100))
    remarks = db.Column(db.Text)
    u_id = db.Column(db.Integer, db.ForeignKey('user.u_id'), nullable=False)
    c_id = db.Column(db.Integer, db.ForeignKey('committee.c_id'), nullable=False)

    user = relationship('User', backref='grievances', foreign_keys=[u_id])
    committee = relationship('Committee', backref='grievances', foreign_keys=[c_id])


# Cheap "is there a recording?" flag that does not load the blob itself.
Grievance.has_audio = column_property(Grievance.__table__.c.audio.isnot(None))
