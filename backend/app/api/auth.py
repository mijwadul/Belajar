# backend/app/api/auth.py

from flask import Blueprint, request, jsonify, current_app
from ..models import User, UserRole, Sekolah # Impor dari paket models
from .. import db 
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity 
from functools import wraps # Tambahkan import ini

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

# --- Fungsi decorator baru untuk memeriksa peran pengguna ---
def roles_required(roles):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            current_user = User.query.get(user_id)
            if current_user and current_user.role.value in roles:
                return fn(*args, **kwargs)
            else:
                return jsonify({'error': 'Akses ditolak untuk peran Anda.'}), 403
        return wrapper
    return decorator
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
@roles_required(['Super User', 'Admin'])
def get_all_users():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if current_user.role == UserRole.ADMIN:
        # Admin hanya bisa melihat user di sekolahnya
        if not current_user.sekolah_id:
            return jsonify([])
        users_query = User.query.filter_by(sekolah_id=current_user.sekolah_id)
    else: # Super User
        users_query = User.query
        
    all_users = users_query.order_by(User.nama_lengkap).all()
    return jsonify([user.to_dict() for user in all_users])

@bp.route('/create-user', methods=['POST'])
@roles_required(['Super User', 'Admin'])
def create_user():
    data = request.get_json()
    role_str = data.get('role')
    
    # Validasi dasar
    if not all([data.get('email'), data.get('password'), data.get('nama_lengkap'), role_str]):
        return jsonify({'error': 'Semua field wajib diisi.'}), 400

    # Logika hak akses Admin
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if current_user.role == UserRole.ADMIN and role_str == 'Admin':
        return jsonify({'error': 'Admin tidak dapat membuat akun Admin lain.'}), 403

    try:
        role_enum = UserRole[role_str.upper().replace(" ", "_")]
    except KeyError:
        return jsonify({'error': f'Peran "{role_str}" tidak valid.'}), 400

    sekolah_id = data.get('sekolah_id')
    if role_enum in [UserRole.ADMIN, UserRole.GURU] and not sekolah_id:
        return jsonify({'error': 'Sekolah wajib dipilih untuk peran Admin dan Guru.'}), 400
    
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email sudah terdaftar.'}), 409

    new_user = User(
        email=data.get('email'),
        nama_lengkap=data.get('nama_lengkap'),
        role=role_enum,
        sekolah_id=sekolah_id if role_enum != UserRole.SUPER_USER else None
    )
    new_user.set_password(data.get('password'))

    db.session.add(new_user)
    db.session.commit()

    return jsonify({'message': f'Pengguna {new_user.nama_lengkap} berhasil dibuat.'}), 201

@bp.route('/users/<int:user_id>', methods=['GET'])
@roles_required(['Super User', 'Admin'])
def get_user(user_id):
    current_user = User.query.get(get_jwt_identity())
    user_to_view = User.query.get_or_404(user_id)
    
    # Aturan untuk Admin
    if current_user.role == UserRole.ADMIN:
        # Admin tidak bisa melihat data Super User
        if user_to_view.role == UserRole.SUPER_USER:
            return jsonify({'error': 'Akses ditolak.'}), 403
        # Admin hanya bisa melihat user di sekolahnya
        if user_to_view.sekolah_id != current_user.sekolah_id:
            return jsonify({'error': 'Anda hanya dapat melihat pengguna di sekolah Anda.'}), 403
            
    # Super User bisa melihat siapa saja
    return jsonify(user_to_view.to_dict())

@bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@roles_required(['Admin', 'Super User'])
def update_user(user_id):
    """Endpoint untuk memperbarui data pengguna."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(int(current_user_id))
    user_to_update = User.query.get_or_404(user_id)
    data = request.get_json()
    user_to_update = User.query.get_or_404(user_id)

    # Logika hak akses Admin
    if current_user.role == UserRole.ADMIN:
        # Admin tidak bisa edit Super User atau Admin lain
        if user_to_update.role in [UserRole.SUPER_USER, UserRole.ADMIN]:
            return jsonify({'error': 'Anda tidak memiliki hak untuk mengedit pengguna ini.'}), 403
        # Admin hanya bisa edit user di sekolahnya
        if user_to_update.sekolah_id != current_user.sekolah_id:
            return jsonify({'error': 'Anda hanya dapat mengedit pengguna di sekolah Anda.'}), 403

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
@roles_required(['Super User', 'Admin'])
def delete_user(user_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    user_to_delete = User.query.get_or_404(user_id)

    # Pengguna tidak bisa menghapus diri sendiri
    if int(current_user_id) == user_id:
        return jsonify({'error': 'Anda tidak dapat menghapus akun Anda sendiri.'}), 400

    # Aturan untuk Admin
    if current_user.role == UserRole.ADMIN:
        # Admin tidak bisa hapus Super User atau Admin lain
        if user_to_delete.role in [UserRole.SUPER_USER, UserRole.ADMIN]:
            return jsonify({'error': 'Admin tidak memiliki hak untuk menghapus pengguna ini.'}), 403
        # Admin hanya bisa hapus user di sekolahnya
        if user_to_delete.sekolah_id != current_user.sekolah_id:
            return jsonify({'error': 'Anda hanya dapat menghapus pengguna di sekolah Anda.'}), 403
    
    # Super User bisa menghapus siapa saja (kecuali diri sendiri)
    db.session.delete(user_to_delete)
    db.session.commit()
    return jsonify({'message': 'Pengguna berhasil dihapus.'}), 200