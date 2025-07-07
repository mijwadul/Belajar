from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from .core.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        from .models import classroom_model

        from .api import classroom
        app.register_blueprint(classroom.bp)

        from .api import ai_tools
        app.register_blueprint(ai_tools.bp)

        @app.route('/health')
        def health_check():
            return 'Backend is running!'

    return app