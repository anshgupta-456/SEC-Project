"""Builds a configured Flask app for any of the services."""
import logging
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import config
from shared.utils.db_utils import db, migrate

# Import every model so relationships resolve no matter which service starts.
from shared.models import admin_model, commitee_model, grievance_model, user_model  # noqa: F401,E402

_warned_about_secret = False


def _ensure_sqlite_dir(uri):
    if uri.startswith("sqlite:///") and not uri.startswith("sqlite:///:memory:"):
        Path(uri[len("sqlite:///"):]).parent.mkdir(parents=True, exist_ok=True)


def create_app(name, blueprint=None, overrides=None, blueprints=None):
    """Create a service app.

    ``blueprint`` registers one blueprint at the root (the per-service apps);
    ``blueprints`` is a list of ``(blueprint, url_prefix)`` pairs (the combined
    production app in ``wsgi.py``).
    """
    global _warned_about_secret

    app = Flask(name, root_path=str(config.BACKEND_DIR))
    app.config.update(
        SQLALCHEMY_DATABASE_URI=config.connection_string,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ECHO=config.SQL_ECHO,
        SQLALCHEMY_ENGINE_OPTIONS={"pool_pre_ping": True},
        MAX_CONTENT_LENGTH=config.MAX_UPLOAD_MB * 1024 * 1024,
    )
    if overrides:
        app.config.update(overrides)

    _ensure_sqlite_dir(app.config["SQLALCHEMY_DATABASE_URI"])
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s %(message)s")

    if config.JWT_SECRET_IS_DEFAULT and not _warned_about_secret:
        app.logger.warning("JWT_SECRET is not set; using an insecure development secret.")
        _warned_about_secret = True

    CORS(app, origins=config.CORS_ORIGINS)
    db.init_app(app)
    migrate.init_app(app, db, directory=config.MIGRATIONS_DIR)

    if blueprint is not None:
        app.register_blueprint(blueprint)
    for bp, prefix in blueprints or []:
        app.register_blueprint(bp, url_prefix=prefix)

    @app.get("/health")
    @app.get("/api/health")
    def health():
        return jsonify(status="ok", service=name)

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return jsonify(message=error.description or error.name), error.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        if isinstance(error, HTTPException):
            return handle_http_error(error)
        db.session.rollback()
        app.logger.exception("Unhandled error")
        return jsonify(message="Something went wrong on the server. Please try again."), 500

    return app
