from sqlalchemy.orm import joinedload
from werkzeug.security import check_password_hash, generate_password_hash

from shared import stats
from shared.models.admin_model import Admin
from shared.models.grievance_model import Grievance
from shared.utils.db_utils import db
from shared.utils.http import clean_str, utcnow


def _scope_criteria(c_id):
    return [Grievance.c_id == c_id] if c_id is not None else []


class AdminService:
    @staticmethod
    def authenticate(identifier, password):
        identifier = clean_str(identifier)
        if identifier.isdigit():
            admin = db.session.get(Admin, int(identifier))
        else:
            admin = Admin.query.filter_by(email=identifier.lower()).first()
        if admin and check_password_hash(admin.password, str(password)):
            return admin
        return None

    @staticmethod
    def email_taken(email, exclude_admin_id=None):
        query = db.session.query(Admin.admin_id).filter(Admin.email == clean_str(email).lower())
        if exclude_admin_id is not None:
            query = query.filter(Admin.admin_id != exclude_admin_id)
        return query.first() is not None

    @staticmethod
    def create_admin(full_name, email, password, phone=None, c_id=None):
        admin = Admin(
            full_name=clean_str(full_name, 100),
            email=clean_str(email, 100).lower(),
            phone=clean_str(phone, 20) or None,
            password=generate_password_hash(str(password)),
            c_id=c_id,
            created_at=utcnow(),
        )
        db.session.add(admin)
        db.session.commit()
        return admin

    @staticmethod
    def update(admin, data):
        admin.full_name = clean_str(data['full_name'], 100)
        admin.email = clean_str(data['email'], 100).lower()
        if 'phone' in data:
            admin.phone = clean_str(data.get('phone'), 20) or None
        db.session.commit()
        return admin

    @staticmethod
    def change_password(admin, current_password, new_password):
        if not check_password_hash(admin.password, str(current_password)):
            return False
        admin.password = generate_password_hash(str(new_password))
        db.session.commit()
        return True

    @staticmethod
    def get_all_grievance(c_id=None):
        return (
            Grievance.query.options(joinedload(Grievance.user))
            .filter(*_scope_criteria(c_id))
            .order_by(Grievance.time_stamp.desc(), Grievance.g_id.desc())
            .all()
        )

    @staticmethod
    def get_grievance(g_id):
        return db.session.get(Grievance, g_id)

    @staticmethod
    def update_grievance_status(grievance, status, remarks=None):
        grievance.status = status
        if remarks is not None:
            grievance.remarks = clean_str(remarks) or None
        grievance.updated_at = utcnow()
        db.session.commit()
        return grievance

    @staticmethod
    def category_counts(c_id, status, months):
        return stats.category_counts(_scope_criteria(c_id), status, months)

    @staticmethod
    def stat_cards(c_id):
        return stats.stat_cards(_scope_criteria(c_id))

    @staticmethod
    def monthly_trend(c_id, months):
        return stats.monthly_trend(_scope_criteria(c_id), months)

    @staticmethod
    def kpi_report(c_id):
        return stats.kpi_report(_scope_criteria(c_id))
