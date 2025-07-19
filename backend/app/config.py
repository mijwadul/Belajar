# backend/app/config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a-super-secret-key'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__name__)), 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'kunci-rahasia-super-aman-untuk-jwt'
    TOGETHER_API_KEY = os.environ.get('TOGETHER_API_KEY')
    TOGETHER_MODEL = os.environ.get('TOGETHER_MODEL') or 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free'
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    GOOGLE_CSE_ID = os.environ.get('GOOGLE_CSE_ID')

    # GEMINI_MODEL = os.environ.get('GEMINI_MODEL') or 'gemini-1.5-flash'
    # GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')