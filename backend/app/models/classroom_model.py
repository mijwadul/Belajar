# backend/app/models/classroom_model.py

from app import db
from sqlalchemy import or_
from .user_model import User, UserRole

# --- PERBAIKAN: Definisi tabel relasi ini dipindahkan ke atas ---
kelas_siswa = db.Table('kelas_siswa',
    db.Column('kelas_id', db.Integer, db.ForeignKey('kelas.id'), primary_key=True),
    db.Column('siswa_id', db.Integer, db.ForeignKey('siswa.id'), primary_key=True)
)
# -------------------------------------------------------------

class Kelas(db.Model):
    __tablename__ = 'kelas'
    id = db.Column(db.Integer, primary_key=True)
    nama_kelas = db.Column(db.String(100), nullable=False)
    jenjang = db.Column(db.String(50), nullable=False)
    mata_pelajaran = db.Column(db.String(100), nullable=False)
    tahun_ajaran = db.Column(db.String(20), nullable=False)
    
    # Kolom relasi yang baru
    sekolah_id = db.Column(db.Integer, db.ForeignKey('sekolah.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False) # Pemilik kelas

    # Relasi
    siswa = db.relationship('Siswa', secondary=kelas_siswa, lazy='subquery', backref=db.backref('kelas_terdaftar', lazy=True))
    rpps = db.relationship('RPP', backref='kelas', lazy=True, cascade="all, delete-orphan")
    pembuat = db.relationship('User', backref='kelas_dibuat', lazy=True)

    def __repr__(self):
        return f'<Kelas {self.nama_kelas}>'
    
    @classmethod
    def get_filtered_classes(cls, search_query=None, jenjang_filter=None, mata_pelajaran_filter=None, user=None):
        """
        Mengambil daftar kelas dengan filter dan hak akses.
        """
        query = cls.query

        # Filter berdasarkan peran pengguna
        if user:
            if user.role == UserRole.GURU:
                query = query.filter_by(user_id=user.id)
            elif user.role == UserRole.ADMIN:
                if not user.sekolah_id:
                    # Admin tanpa sekolah tidak bisa melihat kelas apa pun
                    return []
                query = query.filter_by(sekolah_id=user.sekolah_id)
            # Untuk Super User, tidak ada filter tambahan

        # Filter pencarian
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
    
    # Fungsi get_filtered_classes akan kita sesuaikan nanti di logic API
    
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

    # --- METODE YANG HILANG DITAMBAHKAN KEMBALI DENGAN LOGIKA BARU ---
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
    # Tidak ada perubahan pada model Absensi
    __tablename__ = 'absensi'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, nullable=False, default=db.func.current_date())
    status = db.Column(db.String(20), nullable=False)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False)
    kelas_id = db.Column(db.Integer, db.ForeignKey('kelas.id'), nullable=False)