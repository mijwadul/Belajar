from functools import wraps
from flask_jwt_extended import get_jwt
from flask import jsonify

def roles_required(roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            if 'role' not in claims or claims['role'] not in roles:
                return jsonify({'message': 'Akses ditolak, role tidak sesuai.'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
