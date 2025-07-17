# backend/ninja.py

import os
from dotenv import load_dotenv  # <-- 1. TAMBAHKAN BARIS INI
from app import create_app, db
from app.models.user_model import User, UserRole

load_dotenv()  # <-- 2. TAMBAHKAN BARIS INI

# Buat instance aplikasi untuk mendapatkan konteks
app = create_app()

def create_superuser():
    """
    Membuat pengguna dengan peran Super User.
    Data akan diminta melalui input terminal.
    """
    with app.app_context():
        print("--- Membuat Akun Super User ---")

        # Meminta input dari Anda
        nama_lengkap = input("Masukkan Nama Lengkap: ")
        email = input("Masukkan Email: ")
        password = input("Masukkan Password: ")

        # Validasi input
        if not all([nama_lengkap, email, password]):
            print("Semua field harus diisi. Proses dibatalkan.")
            return

        # Cek apakah email sudah ada
        if User.query.filter_by(email=email).first():
            print(f"Error: Email '{email}' sudah terdaftar.")
            return

        # Buat user baru dengan peran SUPER_USER
        superuser = User(
            nama_lengkap=nama_lengkap,
            email=email,
            role=UserRole.SUPER_USER # Langsung set sebagai Super User
        )
        superuser.set_password(password)

        # Simpan ke database
        db.session.add(superuser)
        db.session.commit()

        print("\n=============================================")
        print("✅ Akun Super User berhasil dibuat!")
        print(f"   Email: {email}")
        print("   Silakan login melalui aplikasi.")
        print("=============================================")


if __name__ == '__main__':
    create_superuser()