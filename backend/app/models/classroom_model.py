from app import db
from datetime import datetime

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
    absensi = db.relationship('Absensi', backref='siswa', lazy=True, cascade="all, delete-orphan")
    jawaban = db.relationship('JawabanSiswa', backref='pemilik', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Siswa {self.nama_lengkap}>'

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
    __tablename__ = 'ujian'
    id = db.Column(db.Integer, primary_key=True)
    judul = db.Column(db.String(255), nullable=False)
    tanggal_ujian = db.Column(db.DateTime, default=datetime.utcnow)
    kelas_id = db.Column(db.Integer, db.ForeignKey('kelas.id'), nullable=False)
    soal_id = db.Column(db.Integer, db.ForeignKey('soal.id'), nullable=False)
    jawaban_siswa = db.relationship('JawabanSiswa', backref='ujian', lazy=True, cascade="all, delete-orphan")

class JawabanSiswa(db.Model):
    __tablename__ = 'jawaban_siswa'
    id = db.Column(db.Integer, primary_key=True)
    jawaban_teks = db.Column(db.Text, nullable=True)
    skor = db.Column(db.Float, nullable=True)
    ujian_id = db.Column(db.Integer, db.ForeignKey('ujian.id'), nullable=False)
    siswa_id = db.Column(db.Integer, db.ForeignKey('siswa.id'), nullable=False)