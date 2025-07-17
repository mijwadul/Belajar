# backend/app/models/content_model.py

from app import db
from datetime import datetime
import json

class RPP(db.Model):
    __tablename__ = 'rpp'
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    konten_markdown = db.Column(db.Text, nullable=False)
    tanggal_dibuat = db.Column(db.DateTime, default=datetime.utcnow)
    kelas_id = db.Column(db.Integer, db.ForeignKey('kelas.id'), nullable=False)
    soal = db.relationship('Soal', backref='rpp', lazy=True, cascade="all, delete-orphan")

    kelas_id = db.Column(db.Integer, db.ForeignKey('kelas.id'), nullable=False)
    sekolah_id = db.Column(db.Integer, db.ForeignKey('sekolah.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # Pembuat RPP

    soal = db.relationship('Soal', backref='rpp', lazy=True, cascade="all, delete-orphan")

class Soal(db.Model):
    __tablename__ = 'soal'
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    konten_json = db.Column(db.Text, nullable=False)
    tanggal_dibuat = db.Column(db.DateTime, default=datetime.utcnow)
    rpp_id = db.Column(db.Integer, db.ForeignKey('rpp.id'), nullable=False)

    rpp_id = db.Column(db.Integer, db.ForeignKey('rpp.id'), nullable=False)
    sekolah_id = db.Column(db.Integer, db.ForeignKey('sekolah.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # Pembuat Soal

class Ujian(db.Model):
    __tablename__ = 'ujian' # Pastikan tablename ada jika menggunakan Alembic
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    konten_json = db.Column(db.Text, nullable=False) # Ini akan menyimpan array soal
    tanggal_dibuat = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', name='fk_ujian_user_id'))
    sekolah_id = db.Column(db.Integer, db.ForeignKey('sekolah.id'), nullable=False)
    
    # NEW: Kolom untuk menyimpan pengaturan layout
    pengaturan_layout = db.Column(db.Text, default='{}') # Akan disimpan sebagai string JSON

    def to_dict(self):
        # NEW: Deserialisasi pengaturan_layout saat mengonversi ke dictionary
        layout_data = {}
        if self.pengaturan_layout:
            try:
                layout_data = json.loads(self.pengaturan_layout)
            except json.JSONDecodeError:
                # Handle error jika string bukan JSON valid
                layout_data = {'error': 'Invalid JSON in layout data'}

        return {
            'id': self.id,
            'judul': self.judul,
            'konten_json': json.loads(self.konten_json), # Deserialisasi konten soal
            'tanggal_dibuat': self.tanggal_dibuat.isoformat(),
            'user_id': self.user_id,
            'layout': layout_data # <--- SERTAKAN LAYOUT DI OUTPUT
        }

class JawabanSiswa(db.Model):
    __tablename__ = 'jawaban_siswa'
    id = db.Column(db.Integer, primary_key=True)
    jawaban_teks = db.Column(db.Text, nullable=True)
    skor = db.Column(db.Float, nullable=True)
    ujian_id = db.Column(db.Integer, db.ForeignKey('ujian.id'), nullable=False)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False)