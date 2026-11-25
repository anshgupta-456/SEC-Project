from flask import jsonify

from shared.auth import ROLE_STUDENT, issue_token
from shared.serializers import user_to_dict


class UserView:
    @staticmethod
    def render_user(user):
        return jsonify(user_to_dict(user))

    @staticmethod
    def render_session(user):
        return jsonify({"token": issue_token(ROLE_STUDENT, user.u_id), "user": user_to_dict(user)})

    @staticmethod
    def render_json(payload):
        return jsonify(payload)
