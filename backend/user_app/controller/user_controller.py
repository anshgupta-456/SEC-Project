from flask import g

from shared.utils.http import json_error, missing_fields
from user_app.services.user_service import UserService
from user_app.view.user_view import UserView

SIGNUP_FIELDS = ['full_name', 'email', 'phone', 'department', 'year', 'student_id', 'password']
MIN_PASSWORD_LENGTH = 6


def _own_account_only(u_id):
    if u_id != g.principal.u_id:
        return json_error("You can only view your own data.", 403)
    return None


class UserController:
    @staticmethod
    def signup(data):
        missing = missing_fields(data, SIGNUP_FIELDS)
        if missing:
            return json_error(f"Missing required fields: {', '.join(missing)}", 400)
        if len(str(data['password'])) < MIN_PASSWORD_LENGTH:
            return json_error(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", 400)
        if '@' not in str(data['email']):
            return json_error("Please enter a valid email address.", 400)
        if UserService.student_id_or_email_taken(data['student_id'], data['email']):
            return json_error("Student ID or Email already exists", 409)

        user = UserService.signup(data)
        return UserView.render_session(user), 201

    @staticmethod
    def login(data):
        if missing_fields(data, ['student_id', 'password']):
            return json_error("Student ID and password are required.", 400)
        user = UserService.authenticate(data['student_id'], data['password'])
        if user is None:
            return json_error("Invalid student ID or password", 401)
        return UserView.render_session(user), 200

    @staticmethod
    def me():
        return UserView.render_user(g.principal), 200

    @staticmethod
    def update(data):
        missing = missing_fields(data, ['full_name', 'email'])
        if missing:
            return json_error(f"Missing required fields: {', '.join(missing)}", 400)
        if '@' not in str(data['email']):
            return json_error("Please enter a valid email address.", 400)
        if UserService.email_taken_by_other(data['email'], g.principal.u_id):
            return json_error("That email is already used by another account.", 409)
        user = UserService.update(g.principal, data)
        return UserView.render_user(user), 200

    @staticmethod
    def change_password(data):
        if missing_fields(data, ['current_password', 'new_password']):
            return json_error("Current and new password are required.", 400)
        if len(str(data['new_password'])) < MIN_PASSWORD_LENGTH:
            return json_error(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", 400)
        if not UserService.change_password(g.principal, data['current_password'], data['new_password']):
            return json_error("Current password is incorrect.", 400)
        return {"message": "Password updated."}, 200

    @staticmethod
    def get_stat_card(u_id):
        denied = _own_account_only(u_id)
        if denied:
            return denied
        return UserView.render_json(UserService.stat_cards(u_id)), 200

    @staticmethod
    def grievance_kpi_report(u_id):
        denied = _own_account_only(u_id)
        if denied:
            return denied
        return UserView.render_json(UserService.kpi_report(u_id)), 200
