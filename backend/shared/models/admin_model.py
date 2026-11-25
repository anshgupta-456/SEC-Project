from sqlalchemy.orm import relationship

from shared.models.commitee_model import Committee  # noqa: F401  (relationship target)
from shared.utils.db_utils import db
from shared.utils.http import utcnow


class Admin(db.Model):
    __tablename__ = 'admin'

    admin_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password = db.Column(db.String(255), nullable=False)
    # NULL means the admin oversees every committee.
    c_id = db.Column(db.Integer, db.ForeignKey('committee.c_id'))
    created_at = db.Column(db.DateTime, default=utcnow)

    committee = relationship('Committee', backref='admin', foreign_keys=[c_id])
