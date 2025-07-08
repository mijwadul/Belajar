# backend/app/api/auth.py

from flask import Blueprint, request, jsonify
from ..models.classroom_model import User, db, UserRole
from sqlalchemy.exc import IntegrityError
from flask_jwt_extended import create_access_token, jwt_required, get_jwt

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
        role=UserRole.GURU # Pengguna baru dari form publik selalu menjadi Guru
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
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
    
    return jsonify({
        'message': 'Login berhasil!',
        'access_token': access_token,
        'user': user.to_dict()
    })

@bp.route('/users', methods=['GET'])
@jwt_required() # Menggunakan decorator standar untuk proteksi
def get_all_users():
    """Endpoint untuk mengambil semua data pengguna (khusus Admin/Super User)."""
    
    # Ambil claims (termasuk peran) dari token JWT yang sudah valid
    claims = get_jwt()
    user_role = claims.get('role')

    # Lakukan pengecekan peran
    if user_role not in ['Admin', 'Super User']:
        return jsonify({'error': 'Akses tidak diizinkan. Hanya untuk Admin.'}), 403

    # Jika diizinkan, ambil data dari database
    users = User.query.all()
    users_list = [user.to_dict() for user in users]
    
    return jsonify(users_list), 200