from flask import Blueprint

from shared.auth import ROLE_STUDENT, login_required
from shared.utils.http import get_json_body
from user_app.controller.user_controller import UserController

user_bp = Blueprint('user_bp', __name__)


@user_bp.route('/signup', methods=['POST'])
def signup():
    return UserController.signup(get_json_body())


@user_bp.route('/login', methods=['POST'])
def login():
    return UserController.login(get_json_body())


@user_bp.route('/me', methods=['GET'])
@login_required(ROLE_STUDENT)
def me():
    return UserController.me()


@user_bp.route('/update', methods=['PUT'])
@login_required(ROLE_STUDENT)
def update():
    return UserController.update(get_json_body())


@user_bp.route('/change_password', methods=['PUT'])
@login_required(ROLE_STUDENT)
def change_password():
    return UserController.change_password(get_json_body())


@user_bp.route('/get_data_statcard/<int:u_id>', methods=['GET'])
@login_required(ROLE_STUDENT)
def get_stat_card_data(u_id):
    return UserController.get_stat_card(u_id)


@user_bp.route('/grievance/kpi_report/<int:u_id>', methods=['GET'])
@login_required(ROLE_STUDENT)
def grievance_kpi_report(u_id):
    return UserController.grievance_kpi_report(u_id)
