from io import BytesIO

from flask import g

from grievance_app.service.grievance_service import GrievanceService
from grievance_app.view.grievance_view import GrievanceView
from ML_Models.MLmodel import MLmodelsClass
from shared.auth import ROLE_ADMIN, admin_committee_scope
from shared.constants import COMMITTEE_IDS, DEFAULT_COMMITTEE, LANGUAGES, normalize_committee
from shared.utils.http import clean_str, json_error

MAX_TITLE_LENGTH = 400
MAX_DESCRIPTION_LENGTH = 10000


class GrievanceController:
    @staticmethod
    def add_grievance(form, files):
        title = clean_str(form.get('title'))
        description = clean_str(form.get('description'))
        language = clean_str(form.get('language') or 'english').lower()
        # "comittee" is the field name older frontends used.
        requested = form.get('committee', form.get('comittee'))

        if not title:
            return json_error("Please enter a title for your grievance.", 400)
        if len(title) > MAX_TITLE_LENGTH:
            return json_error(f"Title must be at most {MAX_TITLE_LENGTH} characters.", 400)
        if not description:
            return json_error("Please describe your grievance (type it or record it).", 400)
        if len(description) > MAX_DESCRIPTION_LENGTH:
            return json_error(f"Description must be at most {MAX_DESCRIPTION_LENGTH} characters.", 400)
        if language not in LANGUAGES:
            return json_error("Unsupported language.", 400)

        c_id = normalize_committee(requested)
        assigned_by = "student"
        if c_id is None:
            label, assigned_by = MLmodelsClass.grievance_classification(description, language)
            c_id = COMMITTEE_IDS.get(label) or COMMITTEE_IDS[DEFAULT_COMMITTEE]

        upload = files.get('audio') or files.get('blob')
        audio = upload.read() if upload else None

        grievance = GrievanceService.add_grievance(
            u_id=g.principal.u_id,
            c_id=c_id,
            desc=description,
            title=title,
            audio=audio or None,
            language=language,
        )
        return GrievanceView.render_created(grievance, assigned_by), 201

    @staticmethod
    def convert_to_text(file, language):
        if file is None:
            return json_error("No audio file was uploaded.", 400)
        language = (language or 'english').lower()
        if language not in LANGUAGES:
            return json_error("Unsupported language.", 400)

        result = MLmodelsClass.speechTotext(BytesIO(file.read()), LANGUAGES[language])
        if result['success']:
            return GrievanceView.render_text(result['text']), 200
        return json_error(result['error'], 422)

    @staticmethod
    def get_all_grievance(user_id):
        if user_id != g.principal.u_id:
            return json_error("You can only view your own grievances.", 403)
        return GrievanceView.render_grievances(GrievanceService.get_all_grievance(user_id)), 200

    @staticmethod
    def get_audio(g_id):
        grievance = GrievanceService.get_grievance(g_id)
        if grievance is None:
            return json_error("Grievance not found.", 404)

        if g.role == ROLE_ADMIN:
            scope = admin_committee_scope()
            allowed = scope is None or scope == grievance.c_id
        else:
            allowed = grievance.u_id == g.principal.u_id
        if not allowed:
            return json_error("You do not have access to this recording.", 403)

        if not grievance.audio:
            return json_error("This grievance has no audio recording.", 404)
        return GrievanceView.render_audio(grievance.audio)
