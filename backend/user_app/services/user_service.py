from werkzeug.security import check_password_hash, generate_password_hash

from shared import stats
from shared.models.grievance_model import Grievance
from shared.models.user_model import User
from shared.utils.db_utils import db
from shared.utils.http import clean_str


class UserService:
    @staticmethod
    def student_id_or_email_taken(student_id, email):
        return db.session.query(User.u_id).filter(
            (User.student_id == clean_str(student_id)) | (User.email == clean_str(email).lower())
        ).first() is not None

    @staticmethod
    def email_taken_by_other(email, u_id):
        return db.session.query(User.u_id).filter(
            User.email == clean_str(email).lower(), User.u_id != u_id
        ).first() is not None

    @staticmethod
    def signup(data):
        user = User(
            full_name=clean_str(data['full_name'], 100),
            student_id=clean_str(data['student_id'], 100),
            email=clean_str(data['email'], 100).lower(),
            phone=clean_str(data['phone'], 15),
            password=generate_password_hash(str(data['password'])),
            department=clean_str(data['department'], 500),
            year=clean_str(data['year'], 10),
        )
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def authenticate(student_id, password):
        user = User.query.filter_by(student_id=clean_str(student_id)).first()
        if user and user.password and check_password_hash(user.password, str(password)):
            return user
        return None

    @staticmethod
    def update(user, data):
        user.full_name = clean_str(data['full_name'], 100)
        user.email = clean_str(data['email'], 100).lower()
        if 'phone' in data:
            user.phone = clean_str(data.get('phone'), 15)
        db.session.commit()
        return user

    @staticmethod
    def change_password(user, current_password, new_password):
        if not check_password_hash(user.password, str(current_password)):
            return False
        user.password = generate_password_hash(str(new_password))
        db.session.commit()
        return True

    @staticmethod
    def stat_cards(u_id):
        return stats.stat_cards([Grievance.u_id == u_id])

    @staticmethod
    def kpi_report(u_id):
        return stats.kpi_report([Grievance.u_id == u_id])
