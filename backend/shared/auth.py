"""JWT authentication shared by all services.

Every service uses the same ``JWT_SECRET`` so a token issued at login by the
user or admin service is accepted by the grievance service too.
"""
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, request

from config import config
from shared.models.admin_model import Admin
from shared.models.user_model import User
from shared.utils.db_utils import db
from shared.utils.http import json_error

ROLE_STUDENT = "student"
ROLE_ADMIN = "admin"
_ALGORITHM = "HS256"


def issue_token(role, subject_id):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(subject_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=_ALGORITHM)


def _load_principal(payload):
    role = payload.get("role")
    model = {ROLE_STUDENT: User, ROLE_ADMIN: Admin}.get(role)
    try:
        subject_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None, None
    if model is None:
        return None, None
    return role, db.session.get(model, subject_id)


def login_required(role=None):
    """Require a valid bearer token. Optionally restrict to one role.

    On success ``g.role`` is "student" or "admin" and ``g.principal`` is the
    corresponding ``User`` or ``Admin`` row.
    """

    def decorator(view):
        @wraps(view)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return json_error("Authentication required. Please log in.", 401)
            token = header[len("Bearer "):].strip()
            try:
                payload = jwt.decode(token, config.JWT_SECRET, algorithms=[_ALGORITHM])
            except jwt.ExpiredSignatureError:
                return json_error("Your session has expired. Please log in again.", 401)
            except jwt.InvalidTokenError:
                return json_error("Invalid session. Please log in again.", 401)

            token_role, principal = _load_principal(payload)
            if principal is None:
                return json_error("Account not found. Please log in again.", 401)
            if role and token_role != role:
                return json_error("You do not have access to this resource.", 403)

            g.role = token_role
            g.principal = principal
            return view(*args, **kwargs)

        return wrapper

    return decorator


def admin_committee_scope():
    """c_id the current admin is limited to, or None for an all-committee admin."""
    if getattr(g, "role", None) != ROLE_ADMIN:
        return None
    return g.principal.c_id
