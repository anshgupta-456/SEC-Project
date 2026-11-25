from shared.constants import STATUS_PENDING
from shared.models.grievance_model import Grievance
from shared.utils.db_utils import db
from shared.utils.http import utcnow


class GrievanceService:
    @staticmethod
    def add_grievance(u_id, c_id, desc, title, audio, language):
        now = utcnow()
        grievance = Grievance(
            u_id=u_id,
            c_id=c_id,
            audio=audio,
            desc=desc,
            status=STATUS_PENDING,
            time_stamp=now,
            updated_at=now,
            title=title,
            language=language,
        )
        db.session.add(grievance)
        db.session.commit()
        return grievance

    @staticmethod
    def get_all_grievance(user_id):
        return (
            Grievance.query.filter_by(u_id=user_id)
            .order_by(Grievance.time_stamp.desc(), Grievance.g_id.desc())
            .all()
        )

    @staticmethod
    def get_grievance(g_id):
        return db.session.get(Grievance, g_id)
