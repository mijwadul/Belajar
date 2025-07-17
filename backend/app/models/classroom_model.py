# backend/app/models/classroom_model.py

from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import enum
from sqlalchemy import or_
import json # NEW: Import json

# Definisikan Enum untuk peran pengguna
class UserRole(enum.Enum):
    SUPER_USER = 'Super User'
    ADMIN = 'Admin'
    GURU = 'Guru'

# Buat kelas model User
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nama_lengkap = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.GURU)

    def set_password(self, password):
        """Membuat hash password yang aman."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Memeriksa apakah password yang dimasukkan cocok dengan hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Mengubah data user menjadi dictionary (tanpa password)."""
        return {
            'id': self.id,
            'nama_lengkap': self.nama_lengkap,
            'email': self.email,
            'role': self.role.value
        }

    def __repr__(self):
        return f'<User {self.nama_lengkap}>'

kelas_siswa = db.Table('kelas_siswa',
    db.Column('kelas_id', db.Integer, db.ForeignKey('kelas.id'), primary_key=True),
    db.Column('siswa_id', db.Integer, db.ForeignKey('siswa.id'), primary_key=True)
)

class Kelas(db.Model):
    __tablename__ = 'kelas'
    id = db.Column(db.Integer, primary_key=True)
    nama_kelas = db.Column(db.String(100), nullable=False)
    jenjang = db.Column(db.String(50), nullable=False)
    mata_pelajaran = db.Column(db.String(100), nullable=False)
    tahun_ajaran = db.Column(db.String(20), nullable=False)
    siswa = db.relationship('Siswa', secondary=kelas_siswa, lazy='subquery', backref=db.backref('kelas_terdaftar', lazy=True))
    rpps = db.relationship('RPP', backref='kelas', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Kelas {self.nama_kelas}>'
    
    @classmethod
    def get_filtered_classes(cls, search_query=None, jenjang_filter=None, mata_pelajaran_filter=None):
        """
        Mengambil daftar kelas dengan kemampuan pencarian dan filter.
        """
        query = cls.query

        if search_query:
            query = query.filter(or_(
                cls.nama_kelas.ilike(f'%{search_query}%'),
                cls.mata_pelajaran.ilike(f'%{search_query}%')
            ))
        
        if jenjang_filter:
            query = query.filter(cls.jenjang == jenjang_filter)

        if mata_pelajaran_filter:
            query = query.filter(cls.mata_pelajaran.ilike(f'%{mata_pelajaran_filter}%'))

        return query.order_by(cls.nama_kelas).all()

class Siswa(db.Model):
    __tablename__ = 'siswa'
    id = db.Column(db.Integer, primary_key=True)
    nama_lengkap = db.Column(db.String(150), nullable=False)
    nisn = db.Column(db.String(20), unique=True, nullable=True)
    nis = db.Column(db.String(20), nullable=True)
    tempat_lahir = db.Column(db.String(100), nullable=True)
    tanggal_lahir = db.Column(db.Date, nullable=True)
    jenis_kelamin = db.Column(db.String(20), nullable=True)
    agama = db.Column(db.String(50), nullable=True)
    alamat = db.Column(db.Text, nullable=True)
    nomor_hp = db.Column(db.String(20), nullable=True)
    nama_orang_tua = db.Column(db.String(150), nullable=True)
    absensi = db.relationship('Absensi', backref='siswa', lazy=True, cascade="all, delete-orphan")
    jawaban = db.relationship('JawabanSiswa', backref='pemilik', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Siswa {self.nama_lengkap}>'
    
    @classmethod
    def get_filtered_students_in_class(cls, kelas_id, search_query=None, jenis_kelamin_filter=None, agama_filter=None):
        """
        Mengambil daftar siswa untuk kelas tertentu dengan kemampuan pencarian dan filter.
        """     
        query = cls.query.join(kelas_siswa).join(Kelas).filter(Kelas.id == kelas_id)

        if search_query:
            query = query.filter(cls.nama_lengkap.ilike(f'%{search_query}%'))
        
        if jenis_kelamin_filter:
            query = query.filter(cls.jenis_kelamin == jenis_kelamin_filter)

        if agama_filter:
            query = query.filter(cls.agama == agama_filter)

        return query.order_by(cls.nama_lengkap).all()

class Absensi(db.Model):
    __tablename__ = 'absensi'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, nullable=False, default=datetime.utcnow)
    status = db.Column(db.String(20), nullable=False)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False)
    kelas_id = db.Column(db.Integer, db.ForeignKey('kelas.id'), nullable=False)

class RPP(db.Model):
    __tablename__ = 'rpp'
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    konten_markdown = db.Column(db.Text, nullable=False)
    tanggal_dibuat = db.Column(db.DateTime, default=datetime.utcnow)
    kelas_id = db.Column(db.Integer, db.ForeignKey('kelas.id'), nullable=False)
    soal = db.relationship('Soal', backref='rpp', lazy=True, cascade="all, delete-orphan")

class Soal(db.Model):
    __tablename__ = 'soal'
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    konten_json = db.Column(db.Text, nullable=False)
    tanggal_dibuat = db.Column(db.DateTime, default=datetime.utcnow)
    rpp_id = db.Column(db.Integer, db.ForeignKey('rpp.id'), nullable=False)

class Ujian(db.Model):
    __tablename__ = 'ujian' # Pastikan tablename ada jika menggunakan Alembic
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    konten_json = db.Column(db.Text, nullable=False) # Ini akan menyimpan array soal
    tanggal_dibuat = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', name='fk_ujian_user_id'))
    
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