from flask import g

from admin_app.services.admin_service import AdminService
from admin_app.view.admin_view import AdminView
from shared.auth import admin_committee_scope
from shared.constants import STATUSES, normalize_committee, normalize_status
from shared.utils.http import json_error, missing_fields

MIN_PASSWORD_LENGTH = 6
MAX_REMARKS_LENGTH = 5000


class AdminController:
    @staticmethod
    def login(data):
        identifier = data.get('admin_id', data.get('identifier'))
        if identifier in (None, "") or not data.get('password'):
            return json_error("Admin ID (or email) and password are required.", 400)
        admin = AdminService.authenticate(identifier, data['password'])
        if admin is None:
            return json_error("Invalid Admin ID or password", 401)
        return AdminView.render_session(admin), 200

    @staticmethod
    def signup(data):
        if g.principal.c_id is not None:
            return json_error("Only an all-committee admin can create admin accounts.", 403)
        missing = missing_fields(data, ['full_name', 'email', 'password'])
        if missing:
            return json_error(f"Missing required fields: {', '.join(missing)}", 400)
        if len(str(data['password'])) < MIN_PASSWORD_LENGTH:
            return json_error(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", 400)
        c_id = None
        if data.get('c_id') not in (None, "", "all"):
            c_id = normalize_committee(data['c_id'])
            if c_id is None:
                return json_error("Unknown committee.", 400)
        if AdminService.email_taken(data['email']):
            return json_error("Admin email already exists", 409)
        admin = AdminService.create_admin(
            full_name=data['full_name'], email=data['email'], password=data['password'],
            phone=data.get('phone'), c_id=c_id,
        )
        return AdminView.render_admin(admin), 201

    @staticmethod
    def me():
        return AdminView.render_admin(g.principal), 200

    @staticmethod
    def update(data):
        missing = missing_fields(data, ['full_name', 'email'])
        if missing:
            return json_error(f"Missing required fields: {', '.join(missing)}", 400)
        if '@' not in str(data['email']):
            return json_error("Please enter a valid email address.", 400)
        if AdminService.email_taken(data['email'], exclude_admin_id=g.principal.admin_id):
            return json_error("That email is already used by another admin.", 409)
        admin = AdminService.update(g.principal, data)
        return AdminView.render_admin(admin), 200

    @staticmethod
    def change_password(data):
        if missing_fields(data, ['current_password', 'new_password']):
            return json_error("Current and new password are required.", 400)
        if len(str(data['new_password'])) < MIN_PASSWORD_LENGTH:
            return json_error(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.", 400)
        if not AdminService.change_password(g.principal, data['current_password'], data['new_password']):
            return json_error("Current password is incorrect.", 400)
        return {"message": "Password updated."}, 200

    @staticmethod
    def get_all_grievance():
        grievances = AdminService.get_all_grievance(admin_committee_scope())
        return AdminView.render_grievances(grievances), 200

    @staticmethod
    def update_grievance_status(g_id, data):
        status = normalize_status(data.get('status'))
        if status is None:
            return json_error(f"Status must be one of: {', '.join(STATUSES)}", 400)
        remarks = data.get('remarks')
        if remarks is not None and len(str(remarks)) > MAX_REMARKS_LENGTH:
            return json_error(f"Remarks must be at most {MAX_REMARKS_LENGTH} characters.", 400)

        grievance = AdminService.get_grievance(g_id)
        if grievance is None:
            return json_error("Grievance not found.", 404)
        scope = admin_committee_scope()
        if scope is not None and grievance.c_id != scope:
            return json_error("This grievance belongs to another committee.", 403)

        grievance = AdminService.update_grievance_status(grievance, status, remarks)
        return AdminView.render_grievance(grievance), 200

    @staticmethod
    def get_grievance_by_category(status, time_range):
        return AdminView.render_json(
            AdminService.category_counts(admin_committee_scope(), status, time_range)
        ), 200

    @staticmethod
    def get_stat_card_data():
        return AdminView.render_json(AdminService.stat_cards(admin_committee_scope())), 200

    @staticmethod
    def get_line_graph_data(time_range):
        return AdminView.render_json(AdminService.monthly_trend(admin_committee_scope(), time_range)), 200

    @staticmethod
    def kpi_report():
        return AdminView.render_json(AdminService.kpi_report(admin_committee_scope())), 200
