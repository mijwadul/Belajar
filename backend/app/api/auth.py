# backend/app/api/auth.py

from flask import Blueprint, request, jsonify
from ..models.classroom_model import User, db, UserRole
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity 

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    """Endpoint untuk mendaftarkan pengguna baru (default sebagai Guru)."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password') or not data.get('nama_lengkap'):
        return jsonify({'error': 'Data tidak lengkap. Pastikan email, password, dan nama lengkap terisi.'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email ini sudah terdaftar.'}), 409

    new_user = User(
        email=data['email'],
        nama_lengkap=data['nama_lengkap'],
        role=UserRole.GURU
    )
    new_user.set_password(data['password'])

    try:
        db.session.add(new_user)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Terjadi kesalahan pada server.', 'details': str(e)}), 500

    return jsonify({'message': 'Registrasi berhasil!', 'user': new_user.to_dict()}), 201

@bp.route('/login', methods=['POST'])
def login():
    """Endpoint untuk login pengguna."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email dan password harus diisi.'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Email atau password salah.'}), 401

    additional_claims = {'role': user.role.value}
    
    # --- PERBAIKAN DI SINI ---
    # Ubah user.id menjadi string saat membuat token
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    # -------------------------
    
    return jsonify({
        'message': 'Login berhasil!',
        'access_token': access_token,
        'user': user.to_dict()
    })

@bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    """Endpoint untuk mengambil semua data pengguna (khusus Admin/Super User)."""
    claims = get_jwt()
    user_role = claims.get('role')

    if user_role not in ['Admin', 'Super User']:
        return jsonify({'error': 'Akses tidak diizinkan.'}), 403

    users = User.query.all()
    users_list = [user.to_dict() for user in users]
    return jsonify(users_list), 200

@bp.route('/create-user', methods=['POST'])
@jwt_required()
def create_user():
    """Endpoint untuk membuat pengguna baru (khusus Admin/Super User)."""
    # 1. Periksa peran pengguna yang sedang login
    claims = get_jwt()
    current_user_role = claims.get('role')
    if current_user_role not in ['Admin', 'Super User']:
        return jsonify({'error': 'Akses tidak diizinkan.'}), 403

    # 2. Ambil data dari form
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    nama_lengkap = data.get('nama_lengkap')
    role_str = data.get('role') # 'Guru' atau 'Admin'

    if not all([email, password, nama_lengkap, role_str]):
        return jsonify({'error': 'Semua field harus diisi.'}), 400

    # 3. Validasi peran
    try:
        # Ubah string peran menjadi objek Enum
        role_enum = UserRole[role_str.upper().replace(" ", "_")]
    except KeyError:
        return jsonify({'error': f'Peran "{role_str}" tidak valid.'}), 400

    # 4. Cek duplikasi email
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email sudah terdaftar.'}), 409

    # 5. Buat dan simpan pengguna baru
    new_user = User(
        email=email,
        nama_lengkap=nama_lengkap,
        role=role_enum
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': f'Pengguna {nama_lengkap} berhasil dibuat dengan peran {role_str}.', 'user': new_user.to_dict()}), 201

@bp.route('/users/<int:id>', methods=['GET'])
@jwt_required()
def get_user(id):
    """Endpoint untuk mengambil data satu pengguna berdasarkan ID."""
    # Pastikan hanya admin yang bisa mengakses
    claims = get_jwt()
    current_user_role = claims.get('role')
    if current_user_role not in ['Admin', 'Super User']:
        return jsonify({'error': 'Akses tidak diizinkan.'}), 403
        
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict())

@bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Endpoint untuk memperbarui data pengguna."""
    claims = get_jwt()
    current_user_role = claims.get('role')
    if current_user_role not in ['Admin', 'Super User']:
        return jsonify({'error': 'Akses tidak diizinkan.'}), 403

    user_to_update = User.query.get_or_404(user_id)
    data = request.get_json()

    # Validasi email agar tidak duplikat dengan pengguna lain
    new_email = data.get('email')
    if new_email and new_email != user_to_update.email and User.query.filter_by(email=new_email).first():
        return jsonify({'error': 'Email sudah digunakan oleh pengguna lain.'}), 409

    # --- PERBAIKAN DI SINI ---
    # Menggunakan 'nama_lengkap' sesuai dengan model database
    user_to_update.nama_lengkap = data.get('nama_lengkap', user_to_update.nama_lengkap)
    user_to_update.email = data.get('email', user_to_update.email)

    # Update peran jika ada dalam data
    if 'role' in data:
        role_str = data.get('role')
        try:
            role_enum = UserRole[role_str.upper().replace(" ", "_")]
            user_to_update.role = role_enum
        except KeyError:
            return jsonify({'error': f'Peran "{role_str}" tidak valid.'}), 400

    # Update password hanya jika diisi
    password = data.get('password')
    if password:
        user_to_update.set_password(password)

    db.session.commit()
    return jsonify({'message': f'Pengguna {user_to_update.nama_lengkap} berhasil diperbarui.'}), 200

@bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Endpoint untuk menghapus pengguna (khusus Admin/Super User)."""
    # 1. Periksa peran pengguna yang sedang login
    claims = get_jwt()
    current_user_role = claims.get('role')
    if current_user_role not in ['Admin', 'Super User']:
        return jsonify({'error': 'Akses tidak diizinkan.'}), 403

    # 2. Periksa agar pengguna tidak bisa menghapus dirinya sendiri
    current_user_id = get_jwt_identity()
    if current_user_id == user_id:
        return jsonify({'error': 'Anda tidak dapat menghapus akun Anda sendiri.'}), 400

    # 3. Cari pengguna yang akan dihapus
    user_to_delete = User.query.get(user_id)
    if not user_to_delete:
        return jsonify({'error': 'Pengguna tidak ditemukan.'}), 404

    # 4. Hapus pengguna dari database
    db.session.delete(user_to_delete)
    db.session.commit()

    return jsonify({'message': f'Pengguna dengan ID {user_id} berhasil dihapus.'}), 200