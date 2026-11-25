from flask import Blueprint

from admin_app.controller.admin_controller import AdminController
from shared.auth import ROLE_ADMIN, login_required
from shared.utils.http import get_json_body

admin_bp = Blueprint("admin_bp", __name__)


@admin_bp.route('/login', methods=['POST'])
def login():
    return AdminController.login(get_json_body())


@admin_bp.route('/signup', methods=['POST'])
@login_required(ROLE_ADMIN)
def signup():
    """Create another admin. Only an all-committee admin may do this."""
    return AdminController.signup(get_json_body())


@admin_bp.route('/me', methods=['GET'])
@login_required(ROLE_ADMIN)
def me():
    return AdminController.me()


@admin_bp.route('/update', methods=['PUT'])
@login_required(ROLE_ADMIN)
def update():
    return AdminController.update(get_json_body())


@admin_bp.route('/change_password', methods=['PUT'])
@login_required(ROLE_ADMIN)
def change_password():
    return AdminController.change_password(get_json_body())


@admin_bp.route('/get_all_grievance', methods=['GET'])
@login_required(ROLE_ADMIN)
def get_all_grievance():
    return AdminController.get_all_grievance()


@admin_bp.route('/grievance/<int:g_id>/status', methods=['PUT'])
@login_required(ROLE_ADMIN)
def update_grievance_status(g_id):
    return AdminController.update_grievance_status(g_id, get_json_body())


@admin_bp.route('/grievanceCategory/<status>/<int:time_range>', methods=['GET'])
@login_required(ROLE_ADMIN)
def get_grievance_by_category(status, time_range):
    return AdminController.get_grievance_by_category(status, time_range)


@admin_bp.route('/get_data_statcard', methods=['GET'])
@login_required(ROLE_ADMIN)
def get_stat_card_data():
    return AdminController.get_stat_card_data()


@admin_bp.route('/get_line_graph_data/<int:time_range>', methods=['GET'])
@login_required(ROLE_ADMIN)
def get_line_graph_data(time_range):
    return AdminController.get_line_graph_data(time_range)


@admin_bp.route('/kpi_report', methods=['GET'])
@login_required(ROLE_ADMIN)
def kpi_report():
    return AdminController.kpi_report()
