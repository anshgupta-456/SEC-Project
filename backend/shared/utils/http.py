"""Small helpers for consistent JSON request/response handling."""
from datetime import datetime, timezone

from flask import jsonify, request


def json_error(message, status=400, **extra):
    payload = {"message": message}
    payload.update(extra)
    return jsonify(payload), status


def get_json_body():
    """Return the JSON body as a dict (empty dict when missing or malformed)."""
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def missing_fields(data, fields):
    """Return the names of required fields that are absent or blank."""
    missing = []
    for field in fields:
        value = data.get(field)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            missing.append(field)
    return missing


def clean_str(value, max_len=None):
    text = "" if value is None else str(value).strip()
    return text[:max_len] if max_len else text


def utcnow():
    """Naive UTC timestamp (what we store in the database)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso_utc(value):
    """Serialize a naive-UTC datetime as ISO-8601 with a trailing Z."""
    if value is None:
        return None
    return value.replace(microsecond=0).isoformat() + "Z"


def month_start(reference, months_back=0):
    """First instant of the month ``months_back`` months before ``reference``."""
    year, month = reference.year, reference.month - months_back
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1)
