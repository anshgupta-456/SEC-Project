from flask import Blueprint, request

from grievance_app.controller.grievance_controller import GrievanceController
from shared.auth import ROLE_STUDENT, login_required

grievance_bp = Blueprint('grievance_bp', __name__)


@grievance_bp.route('/add_grievance', methods=['POST'])
@login_required(ROLE_STUDENT)
def add_grievance():
    return GrievanceController.add_grievance(request.form, request.files)


@grievance_bp.route('/speechToText', methods=['POST'])
@login_required()
def speech_to_text():
    return GrievanceController.convert_to_text(request.files.get('file'), request.form.get('language'))


@grievance_bp.route('/get_all_grievance/<int:user_id>', methods=['GET'])
@login_required(ROLE_STUDENT)
def get_all_grievance(user_id):
    return GrievanceController.get_all_grievance(user_id)


@grievance_bp.route('/get_audio/<int:g_id>', methods=['GET'])
@login_required()
def get_audio(g_id):
    return GrievanceController.get_audio(g_id)
