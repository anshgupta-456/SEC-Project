from flask import jsonify

from shared.auth import ROLE_ADMIN, issue_token
from shared.serializers import admin_to_dict, grievance_to_dict


class AdminView:
    @staticmethod
    def render_admin(admin):
        return jsonify(admin_to_dict(admin))

    @staticmethod
    def render_session(admin):
        return jsonify({"token": issue_token(ROLE_ADMIN, admin.admin_id), "user": admin_to_dict(admin)})

    @staticmethod
    def render_grievance(grievance):
        return jsonify(grievance_to_dict(grievance, include_student=True))

    @staticmethod
    def render_grievances(grievances):
        return jsonify([grievance_to_dict(g, include_student=True) for g in grievances])

    @staticmethod
    def render_json(payload):
        return jsonify(payload)
