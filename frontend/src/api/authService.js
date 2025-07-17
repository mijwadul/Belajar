// frontend/src/api/authService.js

// Menggunakan URL dasar yang lebih fleksibel
const API_BASE_URL = 'http://localhost:5000/api';

// Fungsi untuk mendapatkan token dari localStorage
const getToken = () => {
    return localStorage.getItem('access_token');
};

// Fungsi untuk mendapatkan Authorization header
export const getAuthHeader = () => {
    const token = getToken();
    return token ? `Bearer ${token}` : '';
};

// Fungsi untuk mendaftarkan pengguna baru
export const registerUser = async (userData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal registrasi.');
        }
        return data;
    } catch (error) {
        console.error('Error during registration:', error);
        throw error;
    }
};

// Fungsi untuk login pengguna
export const loginUser = async (credentials) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal login.');
        }
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
    } catch (error) {
        console.error('Error during login:', error);
        throw error;
    }
};

// Fungsi untuk logout pengguna
export const logoutUser = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
};

// Fungsi untuk memeriksa apakah pengguna terautentikasi
export const isAuthenticated = () => {
    return !!getToken();
};

// Fungsi untuk mendapatkan semua pengguna (khusus Admin/Super User)
export const getAllUsers = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal memuat pengguna.');
        }
        return data;
    } catch (error) {
        console.error('Error fetching all users:', error);
        throw error;
    }
};

// Fungsi untuk membuat pengguna baru (khusus Admin/Super User)
export const createUser = async (userData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal membuat pengguna.');
        }
        return data;
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

// Fungsi untuk menghapus pengguna (khusus Admin/Super User)
export const deleteUser = async (userId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal menghapus pengguna.');
        }
        return data;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    }
};

// Fungsi untuk mendapatkan pengguna berdasarkan ID (khusus Admin/Super User)
export const getUserById = async (userId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal memuat detail pengguna.');
        }
        return data;
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        throw error;
    }
};

// Fungsi untuk memperbarui pengguna (khusus Admin/Super User)
export const updateUser = async (userId, userData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(userData)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Gagal memperbarui pengguna.');
        }
        return data;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

// Fungsi untuk mendapatkan semua sekolah
export const getAllSekolah = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/sekolah`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Gagal memuat daftar sekolah.');
        }
        return data;
    } catch (error) {
        console.error('Error fetching all sekolah:', error);
        throw error;
    }
};

// --- FUNGSI BARU DITAMBAHKAN DI SINI ---
// Fungsi untuk membuat sekolah baru (khusus Admin/Super User)
export const createSekolah = async (sekolahData) => {
    try {
        const response = await fetch(`${API_BASE_URL}/sekolah`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(sekolahData),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Gagal menambahkan sekolah baru.');
        }
        return data;
    } catch (error) {
        console.error('Error creating sekolah:', error);
        throw error;
    }
};