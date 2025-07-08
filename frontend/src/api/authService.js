// frontend/src/api/authService.js

const API_URL = 'http://127.0.0.1:5000/api/auth';

export const registerUser = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    // Lemparkan error dengan pesan dari server jika ada
    throw new Error(data.error || 'Gagal melakukan registrasi.');
  }

  return data;
};

export const loginUser = async (credentials) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Gagal melakukan login.');
  }

  // Jika berhasil, simpan token dan data user ke localStorage
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }

  return data;
};

export const logoutUser = () => {
  // Hapus token dan data pengguna dari localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  // Fungsi bantuan untuk memeriksa apakah token ada
  return !!localStorage.getItem('token');
};