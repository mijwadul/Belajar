# backend/app/api/classroom.py

from flask import Blueprint, request, jsonify
from datetime import date
from app.models.classroom_model import Kelas, Siswa, Absensi, UserRole, kelas_siswa
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.auth import roles_required
from sqlalchemy.exc import IntegrityError

bp = Blueprint('classroom_api', __name__, url_prefix='/api')

# --- FUNGSI UNTUK KELAS ---
@bp.route('/kelas', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
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
    return jsonify({'message': 'Kelas baru berhasil ditambahkan!', 'id': kelas_baru.id}), 201

@bp.route('/kelas', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_semua_kelas():
    search_query = request.args.get('search', None)
    jenjang_filter = request.args.get('jenjang', None)
    mata_pelajaran_filter = request.args.get('mata_pelajaran', None)

    semua_kelas = Kelas.get_filtered_classes(
        search_query=search_query,
        jenjang_filter=jenjang_filter,
        mata_pelajaran_filter=mata_pelajaran_filter
    )
    
    hasil = []
    for kelas in semua_kelas:
        data_kelas = {
            'id': kelas.id,
            'nama_kelas': kelas.nama_kelas,
            'jenjang': kelas.jenjang,
            'mata_pelajaran': kelas.mata_pelajaran,
            'tahun_ajaran': kelas.tahun_ajaran
            # Anda mungkin tidak ingin memuat semua siswa di sini untuk setiap kelas demi performa
            # 'siswa_count': len(kelas.siswa) # Contoh untuk menampilkan jumlah siswa
        }
        hasil.append(data_kelas)
    return jsonify(hasil)


# --- FUNGSI UNTUK MENGELOLA SATU KELAS (GET, PUT, DELETE) ---
@bp.route('/kelas/<int:id_kelas>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def kelola_satu_kelas(id_kelas):
    kelas = Kelas.query.get_or_404(id_kelas)

    if request.method == 'GET':
        siswa_di_kelas = []
        for siswa_obj in kelas.siswa:
            siswa_di_kelas.append({
                'id': siswa_obj.id,
                'nama_lengkap': siswa_obj.nama_lengkap,
                'nis': siswa_obj.nis,
                'nisn': siswa_obj.nisn,
                'tempat_lahir': siswa_obj.tempat_lahir,
                'tanggal_lahir': siswa_obj.tanggal_lahir.isoformat() if siswa_obj.tanggal_lahir else None,
                'jenis_kelamin': siswa_obj.jenis_kelamin,
                'agama': siswa_obj.agama,
                'alamat': siswa_obj.alamat,
                'nomor_hp': siswa_obj.nomor_hp
            })
        respons_kelas = {
            'id': kelas.id,
            'nama_kelas': kelas.nama_kelas,
            'jenjang': kelas.jenjang,
            'mata_pelajaran': kelas.mata_pelajaran,
            'tahun_ajaran': kelas.tahun_ajaran,
            'siswa': siswa_di_kelas # Ini akan memuat semua siswa untuk detail kelas
        }
        return jsonify(respons_kelas)

    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({'message': 'Data tidak ditemukan'}), 400

        kelas.nama_kelas = data.get('nama_kelas', kelas.nama_kelas)
        kelas.jenjang = data.get('jenjang', kelas.jenjang)
        kelas.mata_pelajaran = data.get('mata_pelajaran', kelas.mata_pelajaran)
        kelas.tahun_ajaran = data.get('tahun_ajaran', kelas.tahun_ajaran)
        
        try:
            db.session.commit()
            return jsonify({'message': f'Kelas "{kelas.nama_kelas}" berhasil diperbarui!'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error updating class: {e}")
            return jsonify({'message': 'Gagal memperbarui kelas.', 'details': str(e)}), 500

    elif request.method == 'DELETE':
        try:
            # SQLAlchemy cascade delete harusnya menghapus RPP dan Soal terkait
            # Juga relasi di kelas_siswa dan absensi siswa di kelas ini
            db.session.delete(kelas)
            db.session.commit()
            return jsonify({'message': f'Kelas "{kelas.nama_kelas}" berhasil dihapus!'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting class: {e}")
            return jsonify({'message': 'Gagal menghapus kelas.', 'details': str(e)}), 500


# --- FUNGSI UNTUK SISWA (Tambahkan siswa secara global) ---
@bp.route('/siswa', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def tambah_siswa():
    data = request.get_json()
    if not data or not 'nama_lengkap' in data:
        return jsonify({'message': 'Nama lengkap siswa dibutuhkan'}), 400

    if data.get('nisn'):
        existing_siswa = Siswa.query.filter_by(nisn=data['nisn']).first()
        if existing_siswa:
            return jsonify({'message': f"Siswa dengan NISN {data['nisn']} sudah ada."}), 409

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
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def daftarkan_siswa(id_kelas):
    data = request.get_json()
    if not data or not 'id_siswa' in data:
        return jsonify({'message': 'ID Siswa dibutuhkan'}), 400
    
    kelas = Kelas.query.get_or_404(id_kelas)
    siswa = Siswa.query.get_or_404(data['id_siswa'])

    if siswa in kelas.siswa:
        return jsonify({'message': f'Siswa {siswa.nama_lengkap} sudah terdaftar di kelas {kelas.nama_kelas}.'}), 409
        
    kelas.siswa.append(siswa)
    db.session.commit()
    return jsonify({'message': f'Siswa {siswa.nama_lengkap} berhasil didaftarkan ke kelas {kelas.nama_kelas}!'})

# --- FUNGSI UNTUK LIHAT SISWA DI KELAS TERTENTU (DENGAN SEARCH & FILTER) ---
@bp.route('/kelas/<int:id_kelas>/siswa', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_siswa_di_kelas(id_kelas):
    kelas = Kelas.query.get_or_404(id_kelas)

    search_query = request.args.get('search', None)
    jenis_kelamin_filter = request.args.get('jenis_kelamin', None)
    agama_filter = request.args.get('agama', None)

    siswa_di_kelas = Siswa.get_filtered_students_in_class(
        kelas_id=id_kelas,
        search_query=search_query,
        jenis_kelamin_filter=jenis_kelamin_filter,
        agama_filter=agama_filter
    )
    
    hasil_siswa = []
    for siswa_obj in siswa_di_kelas:
        hasil_siswa.append({
            'id': siswa_obj.id,
            'nama_lengkap': siswa_obj.nama_lengkap,
            'nis': siswa_obj.nis,
            'nisn': siswa_obj.nisn,
            'tempat_lahir': siswa_obj.tempat_lahir,
            'tanggal_lahir': siswa_obj.tanggal_lahir.isoformat() if siswa_obj.tanggal_lahir else None,
            'jenis_kelamin': siswa_obj.jenis_kelamin,
            'agama': siswa_obj.agama,
            'alamat': siswa_obj.alamat,
            'nomor_hp': siswa_obj.nomor_hp
        })
    
    return jsonify(hasil_siswa)

# --- FUNGSI UNTUK BULK IMPORT SISWA ---
@bp.route('/kelas/<int:kelas_id>/siswa/bulk-import', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def bulk_import_siswa(kelas_id):
    students_data = request.get_json()
    if not isinstance(students_data, list):
        return jsonify({"message": "Data harus berupa list siswa"}), 400

    success_count = 0
    fail_count = 0
    errors = []
    
    processed_nisns_in_batch = set() 
    
    main_kelas_obj = db.session.query(Kelas).get(kelas_id)
    if not main_kelas_obj:
        return jsonify({"message": f"Kelas dengan ID {kelas_id} tidak ditemukan."}), 404

    for student_data in students_data:
        sub_transaction = db.session.begin_nested() 

        try:
            nama_lengkap = student_data.get('nama_lengkap')
            current_nisn = student_data.get('nisn')

            if not nama_lengkap or not current_nisn:
                fail_count += 1
                errors.append(f"Data siswa tidak lengkap (Nama Lengkap: {nama_lengkap or 'N/A'}, NISN: {current_nisn or 'N/A'}), dilewati.")
                sub_transaction.rollback()
                continue

            if current_nisn in processed_nisns_in_batch:
                fail_count += 1
                errors.append(f"Siswa dengan NISN {current_nisn} adalah duplikat di file Excel ini, dilewati.")
                sub_transaction.rollback()
                continue

            siswa_obj = None
            
            existing_siswa_global = Siswa.query.filter_by(nisn=current_nisn).first()

            if existing_siswa_global:
                siswa_obj = existing_siswa_global
                
                db.session.refresh(siswa_obj)

                if main_kelas_obj in siswa_obj.kelas_terdaftar:
                    fail_count += 1
                    errors.append(f"Siswa {siswa_obj.nama_lengkap} (NISN: {siswa_obj.nisn}) sudah terdaftar di kelas ini, dilewati.")
                    sub_transaction.rollback()
                    continue
                
            else:
                try:
                    tanggal_lahir_str = student_data.get('tanggal_lahir')
                    tanggal_lahir_obj = None
                    if tanggal_lahir_str:
                        tanggal_lahir_obj = date.fromisoformat(tanggal_lahir_str)
                except ValueError:
                    fail_count += 1
                    errors.append(f"Gagal impor siswa '{nama_lengkap}' (NISN: {current_nisn}) karena format Tanggal Lahir salah: '{tanggal_lahir_str or 'kosong'}' (harus YYYY-MM-DD).")
                    sub_transaction.rollback()
                    continue

                siswa_obj = Siswa(
                    nama_lengkap=nama_lengkap,
                    nisn=current_nisn,
                    nis=student_data.get('nis'),
                    tempat_lahir=student_data.get('tempat_lahir'),
                    tanggal_lahir=tanggal_lahir_obj,
                    jenis_kelamin=student_data.get('jenis_kelamin'),
                    agama=student_data.get('agama'),
                    alamat=student_data.get('alamat'),
                    nomor_hp=student_data.get('nomor_hp')
                )
                db.session.add(siswa_obj) 
                db.session.flush()
            
            main_kelas_obj.siswa.append(siswa_obj)
            
            sub_transaction.commit()
            
            success_count += 1
            processed_nisns_in_batch.add(current_nisn)

        except IntegrityError as ie:
            sub_transaction.rollback() 
            fail_count += 1
            error_message = str(ie.orig) if hasattr(ie, 'orig') else str(ie)
            
            if "UNIQUE constraint failed: siswa.nisn" in error_message or ("Duplicate entry" in error_message and "for key 'nisn'" in error_message):
                 errors.append(f"Gagal impor siswa '{nama_lengkap}' (NISN: {current_nisn}) karena NISN sudah terdaftar di sistem.")
            elif "UNIQUE constraint failed: kelas_siswa.kelas_id, kelas_siswa.siswa_id" in error_message:
                errors.append(f"Gagal impor siswa '{nama_lengkap}' (NISN: {current_nisn}) karena sudah terdaftar di kelas ini.")
            else:
                errors.append(f"Gagal mengimpor siswa '{nama_lengkap}' (NISN: {current_nisn}) karena masalah integritas database: {error_message}")
            print(f"IntegrityError importing student {nama_lengkap} (NISN: {current_nisn}): {error_message}")
        except Exception as e: 
            sub_transaction.rollback()
            fail_count += 1
            errors.append(f"Gagal mengimpor siswa '{nama_lengkap}' (NISN: {current_nisn}): {str(e)}")
            print(f"General Error importing student {nama_lengkap}: {e}")

    db.session.commit()

    return jsonify({
        "message": f"Proses impor selesai: {success_count} siswa berhasil, {fail_count} gagal atau dilewati.",
        "success_count": success_count,
        "fail_count": fail_count,
        "errors": errors
    }), 200

# --- FUNGSI UNTUK ABSENSI ---
@bp.route('/kelas/<int:id_kelas>/absensi', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def catat_absensi(id_kelas):
    data = request.get_json()
    if not data or not 'kehadiran' in data:
        return jsonify({'message': 'Data kehadiran tidak lengkap'}), 400
    tanggal_absensi = date.fromisoformat(data.get('tanggal', date.today().isoformat()))
    
    try:
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
    except Exception as e:
        db.session.rollback()
        print(f"Error mencatat absensi: {e}")
        return jsonify({'message': 'Gagal mencatat absensi.'}), 500


# --- PERBAIKAN LOGIKA PENGAMBILAN DATA ABSENSI ---
@bp.route('/kelas/<int:id_kelas>/absensi', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_absensi(id_kelas):
    tanggal_str = request.args.get('tanggal', date.today().isoformat())
    
    try:
        tanggal_obj = date.fromisoformat(tanggal_str)
    except ValueError:
        return jsonify({'message': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.'}), 400
    
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
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def update_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    data = request.get_json()

    if 'nisn' in data and data['nisn'] != siswa.nisn:
        existing_siswa = Siswa.query.filter_by(nisn=data['nisn']).first()
        if existing_siswa and existing_siswa.id != siswa.id:
            return jsonify({'message': f"NISN {data['nisn']} sudah digunakan oleh siswa lain."}), 409

    siswa.nama_lengkap = data.get('nama_lengkap', siswa.nama_lengkap)
    siswa.nisn = data.get('nisn', siswa.nisn)
    siswa.nis = data.get('nis', siswa.nis)
    siswa.tempat_lahir = data.get('tempat_lahir', siswa.tempat_lahir)
    if data.get('tanggal_lahir') is not None:
        siswa.tanggal_lahir = date.fromisoformat(data['tanggal_lahir']) if data['tanggal_lahir'] else None
    siswa.jenis_kelamin = data.get('jenis_kelamin', siswa.jenis_kelamin)
    siswa.agama = data.get('agama', siswa.agama)
    siswa.alamat = data.get('alamat', siswa.alamat)
    siswa.nomor_hp = data.get('nomor_hp', siswa.nomor_hp)

    db.session.commit()
    return jsonify({'message': 'Data siswa berhasil diperbarui!'})

@bp.route('/siswa/<int:id_siswa>', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def hapus_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    
    Absensi.query.filter_by(siswa_id=id_siswa).delete()
    
    db.session.delete(siswa)
    db.session.commit()
    return jsonify({'message': 'Siswa berhasil dihapus!'})