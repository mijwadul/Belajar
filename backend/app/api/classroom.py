# backend/app/api/classroom.py

from flask import Blueprint, request, jsonify
from datetime import date
# Pastikan Siswa diimpor dengan benar
from app.models.classroom_model import Kelas, Siswa, Absensi 
from app import db

bp = Blueprint('classroom_api', __name__, url_prefix='/api')

# --- FUNGSI UNTUK KELAS ---
@bp.route('/kelas', methods=['POST'])
def tambah_kelas():
    data = request.get_json()
    if not data or not all(k in data for k in ['nama_kelas', 'jenjang', 'mata_pelajaran', 'tahun_ajaran']):
        return jsonify({'message': 'Data yang dikirim tidak lengkap'}), 400
    
    kelas_baru = Kelas(
        nama_kelas=data['nama_kelas'],
        jenjang=data['jenjang'],
        mata_pelajaran=data['mata_pelajaran'],
        tahun_ajaran=data['tahun_ajaran']
    )
    db.session.add(kelas_baru)
    db.session.commit()
    return jsonify({'message': 'Kelas baru berhasil ditambahkan!'}), 201

@bp.route('/kelas', methods=['GET'])
def lihat_semua_kelas():
    semua_kelas = Kelas.query.order_by(Kelas.id).all()
    hasil = []
    for kelas in semua_kelas:
        data_kelas = {
            'id': kelas.id,
            'nama_kelas': kelas.nama_kelas,
            'jenjang': kelas.jenjang,
            'mata_pelajaran': kelas.mata_pelajaran,
            'tahun_ajaran': kelas.tahun_ajaran
        }
        hasil.append(data_kelas)
    return jsonify(hasil)

@bp.route('/kelas/<int:id_kelas>', methods=['GET'])
def lihat_satu_kelas(id_kelas):
    kelas = Kelas.query.get_or_404(id_kelas)
    siswa_di_kelas = []
    for siswa in kelas.siswa:
        # Menambahkan NISN ke respons
        siswa_di_kelas.append({
            'id': siswa.id,
            'nama_lengkap': siswa.nama_lengkap,
            'nis': siswa.nis,
            'nisn': siswa.nisn 
        })
    respons_kelas = {
        'id': kelas.id,
        'nama_kelas': kelas.nama_kelas,
        'jenjang': kelas.jenjang,
        'mata_pelajaran': kelas.mata_pelajaran,
        'tahun_ajaran': kelas.tahun_ajaran,
        'siswa': siswa_di_kelas
    }
    return jsonify(respons_kelas)

# --- FUNGSI UNTUK SISWA ---
@bp.route('/siswa', methods=['POST'])
def tambah_siswa():
    data = request.get_json()
    if not data or not 'nama_lengkap' in data:
        return jsonify({'message': 'Nama lengkap siswa dibutuhkan'}), 400

    siswa_baru = Siswa(
        nama_lengkap=data.get('nama_lengkap'),
        nisn=data.get('nisn'),
        nis=data.get('nis'),
        tempat_lahir=data.get('tempat_lahir'),
        tanggal_lahir=date.fromisoformat(data['tanggal_lahir']) if data.get('tanggal_lahir') else None,
        jenis_kelamin=data.get('jenis_kelamin'),
        agama=data.get('agama'),
        alamat=data.get('alamat'),
        nomor_hp=data.get('nomor_hp')
    )
    db.session.add(siswa_baru)
    db.session.commit()
    
    return jsonify({'message': f'Siswa {siswa_baru.nama_lengkap} berhasil ditambahkan!', 'id_siswa': siswa_baru.id}), 201

@bp.route('/kelas/<int:id_kelas>/daftarkan_siswa', methods=['POST'])
def daftarkan_siswa(id_kelas):
    data = request.get_json()
    if not data or not 'id_siswa' in data:
        return jsonify({'message': 'ID Siswa dibutuhkan'}), 400
    kelas = Kelas.query.get_or_404(id_kelas)
    siswa = Siswa.query.get_or_404(data['id_siswa'])
    kelas.siswa.append(siswa)
    db.session.commit()
    return jsonify({'message': f'Siswa {siswa.nama_lengkap} berhasil didaftarkan ke kelas {kelas.nama_kelas}!'})

# --- FUNGSI UNTUK ABSENSI ---
@bp.route('/kelas/<int:id_kelas>/absensi', methods=['POST'])
def catat_absensi(id_kelas):
    data = request.get_json()
    if not data or not 'kehadiran' in data:
        return jsonify({'message': 'Data kehadiran tidak lengkap'}), 400
    tanggal_absensi = date.fromisoformat(data.get('tanggal', date.today().isoformat()))
    for absensi_siswa in data['kehadiran']:
        Absensi.query.filter_by(
            tanggal=tanggal_absensi,
            siswa_id=absensi_siswa['id_siswa'],
            kelas_id=id_kelas
        ).delete()
        catatan_baru = Absensi(
            tanggal=tanggal_absensi,
            status=absensi_siswa['status'],
            siswa_id=absensi_siswa['id_siswa'],
            kelas_id=id_kelas
        )
        db.session.add(catatan_baru)
    db.session.commit()
    return jsonify({'message': 'Absensi berhasil dicatat!'})

# --- PERBAIKAN LOGIKA PENGAMBILAN DATA ABSENSI ---
@bp.route('/kelas/<int:id_kelas>/absensi', methods=['GET'])
def lihat_absensi(id_kelas):
    tanggal_str = request.args.get('tanggal', date.today().isoformat())
    tanggal_obj = date.fromisoformat(tanggal_str)
    
    # Query yang benar untuk mengambil data absensi beserta nama siswa
    catatan_absensi = db.session.query(Absensi, Siswa.nama_lengkap).join(
        Siswa, Absensi.siswa_id == Siswa.id
    ).filter(
        Absensi.kelas_id == id_kelas,
        Absensi.tanggal == tanggal_obj
    ).all()
    
    hasil = []
    for absensi, nama_siswa in catatan_absensi:
        hasil.append({
            'nama_siswa': nama_siswa,
            'status': absensi.status
        })
    return jsonify(hasil)

@bp.route('/siswa/<int:id_siswa>', methods=['PUT'])
def update_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    data = request.get_json()

    # Update data siswa berdasarkan apa yang dikirim dari form
    siswa.nama_lengkap = data.get('nama_lengkap', siswa.nama_lengkap)
    siswa.nisn = data.get('nisn', siswa.nisn)
    siswa.nis = data.get('nis', siswa.nis)
    siswa.tempat_lahir = data.get('tempat_lahir', siswa.tempat_lahir)
    if data.get('tanggal_lahir'):
        siswa.tanggal_lahir = date.fromisoformat(data['tanggal_lahir'])
    siswa.jenis_kelamin = data.get('jenis_kelamin', siswa.jenis_kelamin)
    siswa.agama = data.get('agama', siswa.agama)
    siswa.alamat = data.get('alamat', siswa.alamat)
    siswa.nomor_hp = data.get('nomor_hp', siswa.nomor_hp)

    db.session.commit()
    return jsonify({'message': 'Data siswa berhasil diperbarui!'})

@bp.route('/siswa/<int:id_siswa>', methods=['DELETE'])
def hapus_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    
    # Hapus juga semua data absensi yang terkait dengan siswa ini
    Absensi.query.filter_by(siswa_id=id_siswa).delete()
    
    db.session.delete(siswa)
    db.session.commit()
    return jsonify({'message': 'Siswa berhasil dihapus!'})