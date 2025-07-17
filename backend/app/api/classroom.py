# backend/app/api/classroom.py

from flask import Blueprint, request, jsonify, current_app
from datetime import date, datetime
# Fungsi untuk parsing tanggal lahir dari berbagai format
def parse_tanggal_lahir(tanggal_str):
    if not tanggal_str:
        return None
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d", "%d/%m/%Y", "%d.%m.%Y", "%Y.%m.%d"):
        try:
            return datetime.strptime(tanggal_str, fmt).date()
        except ValueError:
            continue
    # fallback: coba fromisoformat
    try:
        return date.fromisoformat(tanggal_str)
    except Exception:
        return None
from ..models import RPP, Soal, Ujian, Kelas, Siswa, Absensi, User, UserRole, kelas_siswa, Sekolah # Impor model yang dibutuhkan
from .. import db # Impor db dari app utama
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api.auth import roles_required
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_

bp = Blueprint('classroom_api', __name__, url_prefix='/api')

@bp.route('/sekolah', methods=['GET', 'POST'])
@jwt_required()
@roles_required(['Super User', 'Admin'])
def kelola_sekolah():
    # Jika metodenya POST, kita buat sekolah baru
    if request.method == 'POST':
        data = request.get_json()
        if not data or not data.get('nama_sekolah'):
            return jsonify({'message': 'Nama sekolah wajib diisi.'}), 400

        nama_sekolah = data['nama_sekolah']
        # Cek apakah sekolah dengan nama yang sama sudah ada
        if Sekolah.query.filter_by(nama_sekolah=nama_sekolah).first():
            return jsonify({'message': f'Sekolah dengan nama "{nama_sekolah}" sudah ada.'}), 409

        sekolah_baru = Sekolah(
            nama_sekolah=nama_sekolah,
            alamat=data.get('alamat', '')
        )
        db.session.add(sekolah_baru)
        db.session.commit()

        return jsonify({
            'message': 'Sekolah berhasil ditambahkan!',
            'sekolah': {
                'id': sekolah_baru.id,
                'nama_sekolah': sekolah_baru.nama_sekolah
            }
        }), 201

    # Jika metodenya GET, kita kembalikan daftar sekolah (logika yang sudah ada)
    if request.method == 'GET':
        try:
            semua_sekolah = Sekolah.query.order_by(Sekolah.nama_sekolah).all()
            hasil = [{
                'id': s.id,
                'nama_sekolah': s.nama_sekolah
            } for s in semua_sekolah]
            return jsonify(hasil)
        except Exception as e:
            current_app.logger.error(f"Error saat mengambil daftar sekolah: {e}")
            return jsonify({"message": "Gagal mengambil data sekolah."}), 500

# --- FUNGSI UNTUK KELAS ---
@bp.route('/kelas', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru']) # <-- Lebih baik batasi hanya untuk Admin dan Guru
def tambah_kelas():
    data = request.get_json()
    if not data or not all(k in data for k in ['nama_kelas', 'jenjang', 'mata_pelajaran', 'tahun_ajaran']):
        return jsonify({'message': 'Data input tidak lengkap.'}), 400

    # 1. Dapatkan data lengkap user yang sedang login
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)

    # 2. Validasi bahwa user terhubung ke sebuah sekolah
    if not current_user.sekolah_id:
        return jsonify({'message': 'Gagal: Pengguna tidak terhubung dengan sekolah manapun.'}), 400

    # 3. Buat objek Kelas baru dengan menyertakan id pemilik dan sekolah
    kelas_baru = Kelas(
        nama_kelas=data['nama_kelas'],
        jenjang=data['jenjang'],
        mata_pelajaran=data['mata_pelajaran'],
        tahun_ajaran=data['tahun_ajaran'],
        user_id=current_user.id,             # <-- ID pemilik ditambahkan
        sekolah_id=current_user.sekolah_id   # <-- ID sekolah ditambahkan
    )
    
    db.session.add(kelas_baru)
    db.session.commit()
    
    return jsonify({'message': f'Kelas "{kelas_baru.nama_kelas}" berhasil ditambahkan!'}), 201

@bp.route('/kelas', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_semua_kelas():
    # Ambil identitas dan data lengkap user yang sedang login
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)

    # Ambil parameter filter dari request
    search_query = request.args.get('search', None)
    jenjang_filter = request.args.get('jenjang', None)
    mata_pelajaran_filter = request.args.get('mapel', None)

    # Panggil metode yang sudah kita perbaiki, dengan menyertakan info user
    semua_kelas = Kelas.get_filtered_classes(
        search_query=search_query,
        jenjang_filter=jenjang_filter,
        mata_pelajaran_filter=mata_pelajaran_filter,
        user=current_user  # <-- Di sini logika hak akses diterapkan
    )

    # Ubah hasil query menjadi format JSON
    hasil = [{
        'id': k.id,
        'nama_kelas': k.nama_kelas,
        'jenjang': k.jenjang,
        'mata_pelajaran': k.mata_pelajaran,
        'tahun_ajaran': k.tahun_ajaran,
        'jumlah_siswa': len(k.siswa),
        # Tambahkan info pembuat untuk referensi di frontend
        'dibuat_oleh': k.pembuat.nama_lengkap if k.pembuat else 'N/A',
        'nama_sekolah': k.sekolah.nama_sekolah if k.sekolah else 'N/A'
    } for k in semua_kelas]
    
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
                'tanggal_lahir': siswa_obj.tanggal_lahir.strftime('%d %b %Y') if siswa_obj.tanggal_lahir else None,
                'jenis_kelamin': siswa_obj.jenis_kelamin,
                'agama': siswa_obj.agama,
                'alamat': siswa_obj.alamat,
                'nomor_hp': siswa_obj.nomor_hp,
                'nama_orang_tua': siswa_obj.nama_orang_tua
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

    # Normalisasi jenis_kelamin
    jk = data.get('jenis_kelamin')
    if jk == 'L':
        jk = 'Laki-laki'
    elif jk == 'P':
        jk = 'Perempuan'
    siswa_baru = Siswa(
        nama_lengkap=data.get('nama_lengkap'),
        nisn=data.get('nisn'),
        nis=data.get('nis'),
        tempat_lahir=data.get('tempat_lahir'),
        tanggal_lahir=date.fromisoformat(data['tanggal_lahir']) if data.get('tanggal_lahir') else None,
        jenis_kelamin=jk,
        agama=data.get('agama'),
        alamat=data.get('alamat'),
        nomor_hp=data.get('nomor_hp'),
        nama_orang_tua=data.get('nama_orang_tua')
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
            'tanggal_lahir': siswa_obj.tanggal_lahir.strftime('%d %b %Y') if siswa_obj.tanggal_lahir else None,
            'jenis_kelamin': siswa_obj.jenis_kelamin,
            'agama': siswa_obj.agama,
            'alamat': siswa_obj.alamat,
            'nomor_hp': siswa_obj.nomor_hp,
            'nama_orang_tua': siswa_obj.nama_orang_tua
        })
    
    return jsonify(hasil_siswa)

# --- NEW: Endpoint untuk mendapatkan jumlah total siswa ---
@bp.route('/students/total_count', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def get_total_students_count():
    """Menghitung jumlah siswa berdasarkan hak akses pengguna."""
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)

    query = db.session.query(Siswa)

    if current_user.role == UserRole.GURU:
        # Guru hanya menghitung siswa di kelas yang ia ajar
        query = query.join(kelas_siswa).join(Kelas).filter(Kelas.user_id == current_user.id)
    
    elif current_user.role == UserRole.ADMIN:
        if not current_user.sekolah_id:
            return jsonify({'total_students': 0}) # Admin tanpa sekolah tidak punya siswa
        # Admin menghitung semua siswa di sekolahnya.
        # Ini mengasumsikan siswa terhubung ke sekolah melalui kelas.
        query = query.join(kelas_siswa).join(Kelas).filter(Kelas.sekolah_id == current_user.sekolah_id)
        
    # Untuk Super User, tidak ada filter, hitung semua siswa
    
    total_students = query.count()
    return jsonify({'total_students': total_students}), 200

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
                    tanggal_lahir_obj = parse_tanggal_lahir(tanggal_lahir_str)
                except Exception:
                    fail_count += 1
                    errors.append(f"Gagal impor siswa '{nama_lengkap}' (NISN: {current_nisn}) karena format Tanggal Lahir salah: '{tanggal_lahir_str or 'kosong'}' (format didukung: dd-mm-yyyy, yyyy-mm-dd, yyyy/mm/dd, dll)")
                    sub_transaction.rollback()
                    continue

                jk = student_data.get('jenis_kelamin')
                if jk == 'L':
                    jk = 'Laki-laki'
                elif jk == 'P':
                    jk = 'Perempuan'
                siswa_obj = Siswa(
                    nama_lengkap=nama_lengkap,
                    nisn=current_nisn,
                    nis=student_data.get('nis'),
                    tempat_lahir=student_data.get('tempat_lahir'),
                    tanggal_lahir=tanggal_lahir_obj,
                    jenis_kelamin=jk,
                    agama=student_data.get('agama'),
                    alamat=student_data.get('alamat'),
                    nomor_hp=student_data.get('nomor_hp'),
                    nama_orang_tua=student_data.get('nama_orang_tua')
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

# --- NEW ENDPOINT: BULK DELETE SISWA ---
@bp.route('/siswa/bulk-delete', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def bulk_delete_siswa():
    data = request.get_json()
    student_ids = data.get('student_ids', [])

    if not isinstance(student_ids, list) or not all(isinstance(sid, int) for sid in student_ids):
        return jsonify({'message': 'Daftar ID siswa harus berupa array integer yang valid.'}), 400

    success_count = 0
    fail_count = 0
    errors = []

    for student_id in student_ids:
        try:
            siswa_to_delete = Siswa.query.get(student_id)
            if siswa_to_delete:
                # SQLAlchemy with cascade="all, delete-orphan" on relationships
                # in Siswa model (absensi, jawaban) should handle related records.
                # For `kelas_siswa` (many-to-many), deleting the Siswa object
                # should automatically remove its entries from the association table.
                
                db.session.delete(siswa_to_delete)
                db.session.commit() # Commit each deletion within the loop for easier error tracking
                success_count += 1
            else:
                fail_count += 1
                errors.append(f"Siswa dengan ID {student_id} tidak ditemukan.")
        except Exception as e:
            db.session.rollback() # Rollback if any error occurs for this specific deletion
            fail_count += 1
            errors.append(f"Gagal menghapus siswa dengan ID {student_id}: {str(e)}")
            print(f"Error deleting student ID {student_id}: {e}")
    
    if fail_count > 0:
        return jsonify({
            "message": f"{success_count} siswa berhasil dihapus, {fail_count} gagal.",
            "success_count": success_count,
            "fail_count": fail_count,
            "errors": errors
        }), 200 # Return 200 even with partial failure, as some succeeded.
    else:
        return jsonify({"message": f"{success_count} siswa berhasil dihapus."}), 200


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
        return jsonify({'message': 'Format tanggal tidak valid. Gunakan GAAP-MM-DD.'}), 400
    
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
    jk = data.get('jenis_kelamin', siswa.jenis_kelamin)
    if jk == 'L':
        jk = 'Laki-laki'
    elif jk == 'P':
        jk = 'Perempuan'
    siswa.jenis_kelamin = jk
    siswa.agama = data.get('agama', siswa.agama)
    siswa.alamat = data.get('alamat', siswa.alamat)
    siswa.nomor_hp = data.get('nomor_hp', siswa.nomor_hp)
    siswa.nama_orang_tua = data.get('nama_orang_tua', siswa.nama_orang_tua)

    db.session.commit()
    return jsonify({'message': 'Data siswa berhasil diperbarui!'})

@bp.route('/siswa/<int:id_siswa>', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def hapus_siswa(id_siswa):
    siswa = Siswa.query.get_or_404(id_siswa)
    
    Absensi.query.filter_by(siswa_id=id_siswa).delete()
    # Explicitly delete from JawabanSiswa table for this student
    JawabanSiswa.query.filter_by(siswa_id=id_siswa).delete()

    db.session.delete(siswa)
    db.session.commit()
    return jsonify({'message': 'Siswa berhasil dihapus!'})