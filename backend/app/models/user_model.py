# backend/app/models/user_model.py

from app import db
from werkzeug.security import generate_password_hash, check_password_hash
import enum

# 1. Model baru untuk Sekolah
class Sekolah(db.Model):
    __tablename__ = 'sekolah'
    id = db.Column(db.Integer, primary_key=True)
    nama_sekolah = db.Column(db.String(255), unique=True, nullable=False)
    alamat = db.Column(db.Text, nullable=True)
    # Relasi untuk mengambil semua data terkait dari sekolah ini
    users = db.relationship('User', backref='sekolah', lazy=True)
    kelas = db.relationship('Kelas', backref='sekolah', lazy=True)
    rpps = db.relationship('RPP', backref='sekolah', lazy=True)
    ujians = db.relationship('Ujian', backref='sekolah', lazy=True)

    def __repr__(self):
        return f'<Sekolah {self.nama_sekolah}>'

# Definisikan Enum untuk peran pengguna
class UserRole(enum.Enum):
    SUPER_USER = 'Super User'
    ADMIN = 'Admin'
    GURU = 'Guru'

# Kelas model User yang dimodifikasi
class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    nama_lengkap = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.GURU)
    
    sekolah_id = db.Column(db.Integer, db.ForeignKey('sekolah.id'), nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'nama_lengkap': self.nama_lengkap,
            'email': self.email,
            'role': self.role.value,
            # Sertakan info sekolah jika ada
            'sekolah_id': self.sekolah_id,
            'nama_sekolah': self.sekolah.nama_sekolah if self.sekolah else None
        }

    def __repr__(self):
        return f'<User {self.nama_lengkap}>'