// frontend/src/api/authService.js

const API_URL = 'http://127.0.0.1:5000/api/auth';

/**
 * Fungsi bantuan untuk mendapatkan header otentikasi.
 * Mengambil token dari localStorage dan memformatnya.
 */
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    return {};
};

/**
 * Mendaftarkan pengguna baru (default sebagai Guru).
 * @param {object} userData - Data pengguna (nama_lengkap, email, password).
 */
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
        throw new Error(data.error || 'Gagal melakukan registrasi.');
    }

    return data;
};

/**
 * Melakukan login pengguna.
 * @param {object} credentials - Kredensial pengguna (email, password).
 */
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

/**
 * Menghapus token dan data pengguna dari localStorage.
 */
export const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

/**
 * Memeriksa apakah pengguna sudah terotentikasi.
 * @returns {boolean} - true jika token ada, false jika tidak.
 */
export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};

/**
 * Mengambil daftar semua pengguna dari server (memerlukan hak akses Admin).
 */
export const getAllUsers = async () => {
    const response = await fetch(`${API_URL}/users`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(),
        },
    });

    const data = await response.json();

    if (!response.ok) {
        // --- PERBAIKAN DI SINI ---
        // Gunakan data.msg dari backend jika ada, agar pesan error lebih jelas
        throw new Error(data.msg || data.error || 'Gagal mengambil data pengguna.');
    }

    return data;
};

/**
 * Membuat pengguna baru melalui dasbor admin.
 * @param {object} userData - Data pengguna baru (nama_lengkap, email, password, role).
 */
export const createUser = async (userData) => {
    const response = await fetch(`${API_URL}/create-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader(), // Sertakan token otentikasi
        },
        body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Gagal membuat pengguna baru.');
    }

    return data;
};

/**
 * Menghapus pengguna berdasarkan ID (memerlukan hak akses Admin).
 * @param {number} userId - ID pengguna yang akan dihapus.
 */
export const deleteUser = async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
            ...getAuthHeader(), // Sertakan token otentikasi
        },
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.msg || data.error || 'Gagal menghapus pengguna.');
    }

    return data;
};

/**
 * Mengambil data satu pengguna berdasarkan ID.
 * @param {string|number} userId - ID dari pengguna yang akan diambil.
 * @returns {Promise<object>} Data pengguna.
 */
export const getUserById = async (userId) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'GET',
    headers: {
      ...getAuthHeader(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gagal mengambil data pengguna.');
  }
  return data;
};

/**
 * Memperbarui data pengguna.
 * @param {string|number} userId - ID dari pengguna yang akan diperbarui.
 * @param {object} userData - Data baru untuk pengguna.
 * @returns {Promise<object>} Pesan sukses dari server.
 */
export const updateUser = async (userId, userData) => {
  const response = await fetch(`${API_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Gagal memperbarui data pengguna.');
  }
  return data;
};