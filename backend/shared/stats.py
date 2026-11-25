"""Reporting queries used by the student and admin dashboards.

Written with portable SQL plus a little Python so they behave the same on
MySQL and SQLite.
"""
from sqlalchemy import func

from shared.constants import (
    COMMITTEE_DISPLAY_NAMES,
    STATUS_IN_PROGRESS,
    STATUS_PENDING,
    STATUS_RESOLVED,
)
from shared.models.grievance_model import Grievance
from shared.utils.db_utils import db
from shared.utils.http import month_start, utcnow

ALL_STATUSES_KEYS = {"all", "all complaints"}


def _status_counts(criteria):
    rows = (
        db.session.query(Grievance.status, func.count(Grievance.g_id))
        .filter(*criteria)
        .group_by(Grievance.status)
        .all()
    )
    return {status: count for status, count in rows}


def stat_cards(criteria=()):
    """Totals per status, with the change in new grievances vs last month."""
    now = utcnow()
    this_month = month_start(now)
    last_month = month_start(now, 1)

    totals = _status_counts(criteria)
    current = _status_counts([*criteria, Grievance.time_stamp >= this_month])
    previous = _status_counts([
        *criteria,
        Grievance.time_stamp >= last_month,
        Grievance.time_stamp < this_month,
    ])

    def card(key, title, status=None):
        if status is None:
            value, cur, prev = sum(totals.values()), sum(current.values()), sum(previous.values())
        else:
            value, cur, prev = totals.get(status, 0), current.get(status, 0), previous.get(status, 0)
        return {"key": key, "title": title, "value": value, "trend": cur - prev}

    return [
        card("total", "Total Complaints"),
        card("pending", "Pending", STATUS_PENDING),
        card("in_progress", "In Progress", STATUS_IN_PROGRESS),
        card("resolved", "Resolved", STATUS_RESOLVED),
    ]


def kpi_report(criteria=()):
    total = db.session.query(func.count(Grievance.g_id)).filter(*criteria).scalar() or 0
    resolved_rows = (
        db.session.query(Grievance.time_stamp, Grievance.updated_at)
        .filter(*criteria, Grievance.status == STATUS_RESOLVED)
        .all()
    )
    resolved = len(resolved_rows)
    durations = [
        (updated - created).total_seconds()
        for created, updated in resolved_rows
        if created and updated and updated >= created
    ]
    avg_days = (sum(durations) / len(durations) / 86400) if durations else 0
    return {
        "total": total,
        "resolved": resolved,
        "resolution_rate": round(resolved / total * 100, 1) if total else 0,
        "avg_resolution_days": round(avg_days, 2),
    }


def _since(months):
    return month_start(utcnow(), months - 1) if months and months > 0 else None


def category_counts(criteria=(), status="all", months=0):
    filters = list(criteria)
    if status and status.strip().lower() not in ALL_STATUSES_KEYS:
        filters.append(func.lower(Grievance.status) == status.strip().lower())
    since = _since(months)
    if since is not None:
        filters.append(Grievance.time_stamp >= since)

    rows = (
        db.session.query(Grievance.c_id, func.count(Grievance.g_id))
        .filter(*filters)
        .group_by(Grievance.c_id)
        .all()
    )
    counts = {c_id: count for c_id, count in rows}
    return [
        {"c_id": c_id, "category": name, "complaints": counts.get(c_id, 0)}
        for c_id, name in COMMITTEE_DISPLAY_NAMES.items()
    ]


def monthly_trend(criteria=(), months=6):
    """Complaints filed and resolved per calendar month, oldest first."""
    months = max(1, min(int(months or 6), 36))
    now = utcnow()
    buckets = {}
    for back in range(months - 1, -1, -1):
        start = month_start(now, back)
        buckets[(start.year, start.month)] = {
            "month": start.strftime("%b %Y"),
            "totalComplaints": 0,
            "resolved": 0,
        }

    rows = (
        db.session.query(Grievance.time_stamp, Grievance.status)
        .filter(*criteria, Grievance.time_stamp >= month_start(now, months - 1))
        .all()
    )
    for created, status in rows:
        bucket = buckets.get((created.year, created.month))
        if bucket is None:
            continue
        bucket["totalComplaints"] += 1
        if status == STATUS_RESOLVED:
            bucket["resolved"] += 1
    return list(buckets.values())
