"""Domain constants shared by every service."""

# c_id -> canonical (lower-case) committee key. Seeded into the committee table.
COMMITTEES = {
    1: "examination",
    2: "infrastructure",
    3: "general facility",
    4: "research facility",
    5: "journals/literature",
    6: "fellowship",
}
COMMITTEE_IDS = {name: c_id for c_id, name in COMMITTEES.items()}
COMMITTEE_DISPLAY_NAMES = {
    1: "Examination",
    2: "Infrastructure",
    3: "General Facility",
    4: "Research Facility",
    5: "Journals/Literature",
    6: "Fellowship",
}
DEFAULT_COMMITTEE = "general facility"

STATUS_PENDING = "Pending"
STATUS_IN_PROGRESS = "In Progress"
STATUS_RESOLVED = "Resolved"
STATUS_REJECTED = "Rejected"
STATUSES = (STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_RESOLVED, STATUS_REJECTED)

# UI language key -> Google speech-recognition language code
LANGUAGES = {
    "english": "en-IN",
    "hindi": "hi-IN",
    "marathi": "mr-IN",
    "gujarati": "gu-IN",
}


def normalize_committee(value):
    """Map user input ("Research_Facility", "4", "general facility") to a c_id.

    Returns None when the value does not name a committee (e.g. "auto").
    """
    if value is None:
        return None
    text = str(value).strip().lower().replace("_", " ")
    if text.isdigit() and int(text) in COMMITTEES:
        return int(text)
    return COMMITTEE_IDS.get(text)


def normalize_status(value):
    """Return the canonical spelling of a status, or None if unknown."""
    if not value:
        return None
    lookup = {s.lower(): s for s in STATUSES}
    return lookup.get(str(value).strip().lower())
