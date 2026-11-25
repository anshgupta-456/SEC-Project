"""JSON shapes returned by the API, shared so every service agrees."""
from shared.constants import COMMITTEE_DISPLAY_NAMES
from shared.utils.http import iso_utc


def committee_name(c_id):
    return COMMITTEE_DISPLAY_NAMES.get(c_id, "Unassigned")


def user_to_dict(user):
    return {
        "u_id": user.u_id,
        "student_id": user.student_id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "department": user.department,
        "year": user.year,
        "role": "student",
        "isAdmin": False,
    }


def admin_to_dict(admin):
    return {
        "admin_id": admin.admin_id,
        "full_name": admin.full_name,
        "email": admin.email,
        "phone": admin.phone,
        "c_id": admin.c_id,
        "committee": committee_name(admin.c_id) if admin.c_id else "All committees",
        "role": "admin",
        "isAdmin": True,
    }


def grievance_to_dict(grievance, include_student=False):
    data = {
        "id": grievance.g_id,
        "title": grievance.title,
        "description": grievance.desc,
        "language": grievance.language,
        "c_id": grievance.c_id,
        "committee": committee_name(grievance.c_id),
        "status": grievance.status,
        "remarks": grievance.remarks,
        "has_audio": bool(grievance.has_audio),
        "created_at": iso_utc(grievance.time_stamp),
        "updated_at": iso_utc(grievance.updated_at),
    }
    if include_student and grievance.user is not None:
        data.update({
            "student_id": grievance.user.student_id,
            "student_name": grievance.user.full_name,
            "department": grievance.user.department,
            "year": grievance.user.year,
        })
    return data
