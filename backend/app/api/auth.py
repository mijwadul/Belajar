# backend/app/api/auth.py

from flask import Blueprint, request, jsonify
from ..models import User, UserRole, Sekolah # Impor dari paket models
from .. import db # Impor db dari app utama
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity 
from functools import wraps # Tambahkan import ini

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# --- Fungsi decorator baru untuk memeriksa peran pengguna ---
def roles_required(roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            claims = get_jwt() # Menggunakan get_jwt() untuk mengambil semua claims
            # Pastikan 'role' ada dalam claims dan peran pengguna ada dalam daftar peran yang diizinkan
            if "role" not in claims or claims["role"] not in roles:
                return jsonify({"message": "Akses tidak diizinkan: Peran tidak sesuai"}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper
# --- Akhir fungsi decorator ---


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
    
    # Ubah user.id menjadi string saat membuat token
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    
    return jsonify({
        'message': 'Login berhasil!',
        'access_token': access_token,
        'user': user.to_dict()
    })

@bp.route('/users', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Super User']) # Tambahkan proteksi peran
def get_all_users():
    """Endpoint untuk mengambil semua data pengguna (khusus Admin/Super User)."""
    # Peran sudah diperiksa oleh decorator roles_required
    users = User.query.all()
    users_list = [user.to_dict() for user in users]
    return jsonify(users_list), 200

@bp.route('/create-user', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Super User'])
def create_user():
    """Endpoint untuk membuat pengguna baru (khusus Admin/Super User)."""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    nama_lengkap = data.get('nama_lengkap')
    role_str = data.get('role')
    sekolah_id = data.get('sekolah_id') # <-- Ambil sekolah_id dari request

    if not all([email, password, nama_lengkap, role_str]):
        return jsonify({'error': 'Semua field wajib diisi.'}), 400

    try:
        role_enum = UserRole[role_str.upper().replace(" ", "_")]
    except KeyError:
        return jsonify({'error': f'Peran "{role_str}" tidak valid.'}), 400

    # --- Validasi Baru ---
    if role_enum in [UserRole.ADMIN, UserRole.GURU] and not sekolah_id:
        return jsonify({'error': 'Sekolah wajib dipilih untuk peran Admin dan Guru.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email sudah terdaftar.'}), 409

    new_user = User(
        email=email,
        nama_lengkap=nama_lengkap,
        role=role_enum,
        sekolah_id=sekolah_id if role_enum != UserRole.SUPER_USER else None # <-- Simpan sekolah_id
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': f'Pengguna {nama_lengkap} berhasil dibuat.', 'user': new_user.to_dict()}), 201

@bp.route('/users/<int:id>', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Super User']) # Tambahkan proteksi peran
def get_user(id):
    """Endpoint untuk mengambil data satu pengguna berdasarkan ID."""
    # Peran sudah diperiksa oleh decorator roles_required
    user = User.query.get_or_404(id)
    return jsonify(user.to_dict())

@bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@roles_required(['Admin', 'Super User'])
def update_user(user_id):
    """Endpoint untuk memperbarui data pengguna."""
    user_to_update = User.query.get_or_404(user_id)
    data = request.get_json()

    new_email = data.get('email')
    if new_email and new_email != user_to_update.email and User.query.filter_by(email=new_email).first():
        return jsonify({'error': 'Email sudah digunakan oleh pengguna lain.'}), 409

    user_to_update.nama_lengkap = data.get('nama_lengkap', user_to_update.nama_lengkap)
    user_to_update.email = data.get('email', user_to_update.email)
    
    # --- Logika Update Peran dan Sekolah ---
    if 'role' in data:
        role_str = data.get('role')
        try:
            role_enum = UserRole[role_str.upper().replace(" ", "_")]
            user_to_update.role = role_enum

            # Jika diubah menjadi Super User, hapus sekolah_id
            if role_enum == UserRole.SUPER_USER:
                user_to_update.sekolah_id = None
            # Jika diubah menjadi Admin/Guru, pastikan sekolah_id ada
            elif 'sekolah_id' in data:
                user_to_update.sekolah_id = data.get('sekolah_id')

        except KeyError:
            return jsonify({'error': f'Peran "{role_str}" tidak valid.'}), 400

    # Jika hanya sekolah yang diubah
    elif 'sekolah_id' in data and user_to_update.role != UserRole.SUPER_USER:
         user_to_update.sekolah_id = data.get('sekolah_id')
    
    password = data.get('password')
    if password:
        user_to_update.set_password(password)

    db.session.commit()
    return jsonify({'message': f'Pengguna {user_to_update.nama_lengkap} berhasil diperbarui.'}), 200

@bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Super User']) # Tambahkan proteksi peran
def delete_user(user_id):
    """Endpoint untuk menghapus pengguna (khusus Admin/Super User)."""
    # Peran sudah diperiksa oleh decorator roles_required
    current_user_id = get_jwt_identity()
    # current_user_id dari get_jwt_identity() adalah string, ubah ke int
    if int(current_user_id) == user_id:
        return jsonify({'error': 'Anda tidak dapat menghapus akun Anda sendiri.'}), 400

    user_to_delete = User.query.get(user_id)
    if not user_to_delete:
        return jsonify({'error': 'Pengguna tidak ditemukan.'}), 404

    db.session.delete(user_to_delete)
    db.session.commit()

    return jsonify({'message': f'Pengguna dengan ID {user_id} berhasil dihapus.'}), 200