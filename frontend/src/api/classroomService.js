// frontend/src/api/classroomService.js

const API_URL = 'http://127.0.0.1:5000/api';

// Fungsi untuk mengambil semua data kelas
export const getKelas = async () => {
    const response = await fetch(`${API_URL}/kelas`);
    if (!response.ok) {
        throw new Error('Gagal mengambil data kelas');
    }
    return response.json();
};

// Fungsi untuk mengirim data kelas baru
export const tambahKelas = async (dataKelas) => {
    const response = await fetch(`${API_URL}/kelas`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataKelas),
    });
    if (!response.ok) {
        throw new Error('Gagal menambahkan kelas');
    }
    return response.json();
};

export const tambahSiswa = async (dataSiswa) => {
    const response = await fetch(`${API_URL}/siswa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataSiswa),
    });
    if (!response.ok) throw new Error('Gagal menambah siswa');
    return response.json();
};

// Fungsi untuk mendaftarkan siswa ke kelas
export const daftarkanSiswaKeKelas = async (idKelas, idSiswa) => {
    const response = await fetch(`${API_URL}/kelas/${idKelas}/daftarkan_siswa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_siswa: idSiswa }),
    });
    if (!response.ok) throw new Error('Gagal mendaftarkan siswa');
    return response.json();
};

export const getKelasDetail = async (idKelas) => {
    const response = await fetch(`${API_URL}/kelas/${idKelas}`);
    if (!response.ok) {
        throw new Error('Gagal mengambil detail kelas');
    }
    return response.json();
};

export const catatAbsensi = async (idKelas, dataAbsensi) => {
    const response = await fetch(`${API_URL}/kelas/${idKelas}/absensi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataAbsensi),
    });
    if (!response.ok) {
        throw new Error('Gagal mencatat absensi');
    }
    return response.json();
};

export const getAbsensi = async (idKelas, tanggal) => {
    // Mengirim tanggal sebagai query parameter
    const response = await fetch(`${API_URL}/kelas/${idKelas}/absensi?tanggal=${tanggal}`);
    if (!response.ok) {
        throw new Error('Gagal mengambil data absensi');
    }
    return response.json();
};

export const updateSiswa = async (idSiswa, dataSiswa) => {
    const response = await fetch(`${API_URL}/siswa/${idSiswa}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataSiswa),
    });
    if (!response.ok) throw new Error('Gagal memperbarui data siswa');
    return response.json();
};

export const deleteSiswa = async (idSiswa) => {
    const response = await fetch(`${API_URL}/siswa/${idSiswa}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Gagal menghapus siswa');
    return response.json();
};