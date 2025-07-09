# backend/app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from .config import Config # [cite: 2]

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # --- KONFIGURASI APLIKASI ---
    app.config["SQLALCHEMY_DATABASE_URI"] = Config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = Config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]
    app.config["JWT_CSRF_PROTECTION"] = False
    # PENTING: Tambahkan baris ini untuk memuat GEMINI_MODEL
    app.config["GEMINI_MODEL"] = Config.GEMINI_MODEL # [cite: 2]


    # --- INISIALISASI EKSTENSI ---
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(
        app, 
        resources={r"/api/.*": {"origins": "http://localhost:3000"}}, 
        supports_credentials=True,
        allow_headers=["Authorization", "Content-Type"] # <-- Tambahkan ini
    )

    # --- DAFTARKAN BLUEPRINT ---
    with app.app_context():
        from .api import auth, classroom, ai_tools
        app.register_blueprint(auth.bp)
        app.register_blueprint(classroom.bp)
        app.register_blueprint(ai_tools.bp)

    @app.route("/")
    def index():
        return "Hello, SinerGi-AI Backend is running."

    return app