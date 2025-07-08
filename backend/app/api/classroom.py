# backend/app/api/classroom.py

from flask import Blueprint, request, jsonify
from datetime import date
from app.models.classroom_model import Kelas, Siswa, Absensi, UserRole
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.auth import roles_required
from sqlalchemy.exc import IntegrityError

bp = Blueprint('classroom_api', __name__, url_prefix='/api')

# --- FUNGSI UNTUK KELAS ---
@bp.route('/kelas', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
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
@jwt_required()
def lihat_satu_kelas(id_kelas):
    kelas = Kelas.query.get_or_404(id_kelas)
    siswa_di_kelas = []
    # Mengambil siswa yang terdaftar di kelas ini melalui tabel asosiasi
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
        'siswa': siswa_di_kelas
    }
    return jsonify(respons_kelas)

# --- FUNGSI UNTUK SISWA ---
@bp.route('/siswa', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
def tambah_siswa():
    data = request.get_json()
    if not data or not 'nama_lengkap' in data:
        return jsonify({'message': 'Nama lengkap siswa dibutuhkan'}), 400

    # Cek duplikasi NISN
    if data.get('nisn'):
        existing_siswa = Siswa.query.filter_by(nisn=data['nisn']).first()
        if existing_siswa:
            return jsonify({'message': f"Siswa dengan NISN {data['nisn']} sudah ada."}), 409 # Conflict

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
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
def daftarkan_siswa(id_kelas):
    data = request.get_json()
    if not data or not 'id_siswa' in data:
        return jsonify({'message': 'ID Siswa dibutuhkan'}), 400
    
    kelas = Kelas.query.get_or_404(id_kelas)
    siswa = Siswa.query.get_or_404(data['id_siswa'])

    # Pastikan siswa belum terdaftar di kelas ini
    if siswa in kelas.siswa:
        return jsonify({'message': f'Siswa {siswa.nama_lengkap} sudah terdaftar di kelas {kelas.nama_kelas}.'}), 409 # Conflict
        
    kelas.siswa.append(siswa)
    db.session.commit()
    return jsonify({'message': f'Siswa {siswa.nama_lengkap} berhasil didaftarkan ke kelas {kelas.nama_kelas}!'})

# --- NEW: FUNGSI UNTUK BULK IMPORT SISWA ---
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
    
    # Set untuk melacak NISN dan asosiasi yang sudah diproses dalam batch ini
    # Ini mencegah duplikasi dalam file Excel yang sama
    processed_nisns_in_batch = set() 
    
    # Tidak perlu processed_associations_in_batch secara eksplisit jika kita mengandalkan kelas.siswa
    # Tapi kita akan me-refresh kelas setiap iterasi.

    for student_data in students_data:
        # Gunakan sub-transaksi (savepoint) untuk setiap siswa untuk isolasi error
        sub_transaction = db.session.begin_nested() 

        try:
            # Pastikan objek kelas selalu segar di setiap iterasi
            # Ini penting karena commit di iterasi sebelumnya bisa membuat objek 'kelas' jadi stale
            kelas = db.session.query(Kelas).get(kelas_id)
            if not kelas: # Fallback jika kelas tidak ditemukan (harusnya sudah ditangani di atas)
                fail_count += 1
                errors.append(f"Kelas dengan ID {kelas_id} tidak ditemukan.")
                sub_transaction.rollback()
                continue

            # Basic validation for required fields
            if not student_data.get('nama_lengkap') or not student_data.get('nisn'):
                fail_count += 1
                errors.append(f"Data siswa tidak lengkap (Nama Lengkap/NISN kosong): {student_data.get('nama_lengkap', 'N/A')}")
                sub_transaction.rollback()
                continue

            current_nisn = student_data['nisn']

            # 1. Cek duplikasi NISN dalam file Excel batch ini
            if current_nisn in processed_nisns_in_batch:
                fail_count += 1
                errors.append(f"Siswa dengan NISN {current_nisn} adalah duplikat di file Excel ini, dilewati.")
                sub_transaction.rollback()
                continue

            siswa_obj = None
            
            # 2. Cek apakah siswa dengan NISN ini sudah ada di tabel Siswa (secara global)
            existing_siswa_global = Siswa.query.filter_by(nisn=current_nisn).first()

            if existing_siswa_global:
                siswa_obj = existing_siswa_global
                # Refresh objek siswa dari database untuk memastikan status terbarunya di session
                db.session.refresh(siswa_obj) 
                
                # 3. Jika siswa sudah ada secara global, cek apakah dia sudah terdaftar di kelas ini
                # Menggunakan hubungan kelas.siswa yang sudah di-refresh
                if siswa_obj in kelas.siswa: # Gunakan pengecekan relationship langsung
                    fail_count += 1
                    errors.append(f"Siswa {siswa_obj.nama_lengkap} (NISN: {siswa_obj.nisn}) sudah terdaftar di kelas ini, dilewati.")
                    sub_transaction.rollback()
                    continue # Lewati siswa ini
                # Jika siswa ada secara global tapi BELUM di kelas ini, lanjutkan untuk mendaftarkannya
            else:
                # Siswa TIDAK ada secara global, buat objek siswa baru
                siswa_obj = Siswa(
                    nama_lengkap=student_data.get('nama_lengkap'),
                    nisn=student_data.get('nisn'),
                    nis=student_data.get('nis'),
                    tempat_lahir=student_data.get('tempat_lahir'),
                    tanggal_lahir=date.fromisoformat(student_data['tanggal_lahir']) if student_data.get('tanggal_lahir') else None,
                    jenis_kelamin=student_data.get('jenis_kelamin'),
                    agama=student_data.get('agama'),
                    alamat=student_data.get('alamat'),
                    nomor_hp=student_data.get('nomor_hp')
                )
                db.session.add(siswa_obj) # Tambahkan siswa baru ke session
                db.session.flush() # Penting: Flush untuk mendapatkan ID siswa baru sebelum membuat asosiasi
            
            # 4. Tambahkan siswa ke hubungan kelas.siswa
            # Langkah ini hanya tercapai jika siswa perlu diasosiasikan (baik baru atau sudah ada tapi belum terdaftar di kelas ini)
            kelas.siswa.append(siswa_obj)
            
            # Commit savepoint untuk mengaplikasikan perubahan siswa ini ke database
            sub_transaction.commit() 
            
            success_count += 1
            # Tambahkan ke set yang sudah diproses dalam batch
            processed_nisns_in_batch.add(current_nisn)

        except IntegrityError as ie:
            # Menangani error integritas database (misalnya, duplikasi NISN karena UNIQUE constraint, atau duplikasi asosiasi)
            db.session.rollback(sub_transaction) # Rollback savepoint
            fail_count += 1
            # Pesan error yang lebih spesifik untuk IntegrityError
            if "UNIQUE constraint failed: siswa.nisn" in str(ie):
                 errors.append(f"Gagal impor siswa '{student_data.get('nama_lengkap', 'N/A')}' (NISN: {student_data.get('nisn', 'N/A')}) karena NISN sudah terdaftar di sistem.")
            elif "UNIQUE constraint failed: kelas_siswa.kelas_id, kelas_siswa.siswa_id" in str(ie):
                errors.append(f"Gagal impor siswa '{student_data.get('nama_lengkap', 'N/A')}' (NISN: {student_data.get('nisn', 'N/A')}) karena sudah terdaftar di kelas ini.")
            else:
                errors.append(f"Gagal mengimpor siswa '{student_data.get('nama_lengkap', 'N/A')}' (NISN: {student_data.get('nisn', 'N/A')}) karena masalah integritas database: {str(ie)}")
        except ValueError as ve: 
            sub_transaction.rollback() # Rollback savepoint
            fail_count += 1
            errors.append(f"Gagal mengimpor siswa '{student_data.get('nama_lengkap', 'N/A')}' (NISN: {student_data.get('nisn', 'N/A')}) karena format tanggal salah: {str(ve)}")
        except Exception as e: # Menangkap error lain yang tidak terduga
            sub_transaction.rollback() # Rollback savepoint
            fail_count += 1
            errors.append(f"Gagal mengimpor siswa '{student_data.get('nama_lengkap', 'N/A')}' (NISN: {student_data.get('nisn', 'N/A')}): {str(e)}")
            print(f"Error importing student {student_data.get('nama_lengkap')}: {e}")

    return jsonify({
        "message": f"Proses impor selesai: {success_count} siswa berhasil, {fail_count} gagal atau dilewati.",
        "success_count": success_count,
        "fail_count": fail_count,
        "errors": errors
    }), 200


# --- FUNGSI UNTUK ABSENSI ---
@bp.route('/kelas/<int:id_kelas>/absensi', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
def catat_absensi(id_kelas):
    data = request.get_json()
    if not data or not 'kehadiran' in data:
        return jsonify({'message': 'Data kehadiran tidak lengkap'}), 400
    tanggal_absensi = date.fromisoformat(data.get('tanggal', date.today().isoformat()))
    
    try:
        for absensi_siswa in data['kehadiran']:
            # Hapus catatan absensi yang sudah ada untuk tanggal dan siswa ini
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
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
def lihat_absensi(id_kelas):
    tanggal_str = request.args.get('tanggal', date.today().isoformat())
    
    try:
        tanggal_obj = date.fromisoformat(tanggal_str)
    except ValueError:
        return jsonify({'message': 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.'}), 400
    
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
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
def update_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    data = request.get_json()

    # Cek duplikasi NISN jika NISN diubah
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
@roles_required(['Admin', 'Guru', 'Super User']) # Tambahkan 'Super User'
def hapus_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    
    # Hapus juga semua data absensi yang terkait dengan siswa ini
    Absensi.query.filter_by(siswa_id=id_siswa).delete()
    
    db.session.delete(siswa)
    db.session.commit()
    return jsonify({'message': 'Siswa berhasil dihapus!'})