# backend/app/core/config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a-super-secret-key'
    # Tambahkan baris ini
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__name__)), 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False