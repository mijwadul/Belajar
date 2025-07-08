// frontend/src/api/classroomService.js

import { getAuthHeader } from './authService'; // Pastikan ini diimpor

const API_URL = 'http://localhost:5000/api'; // Sesuaikan jika API Anda berjalan di port atau domain lain

// --- Kelas ---
export const getKelas = async () => {
    try {
        const response = await fetch(`${API_URL}/kelas`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat kelas');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching classes:", error);
        throw error;
    }
};

export const tambahKelas = async (kelasData) => {
    try {
        const response = await fetch(`${API_URL}/kelas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(kelasData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menambah kelas');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding class:", error);
        throw error;
    }
};

export const getKelasDetail = async (idKelas) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${idKelas}`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat detail kelas');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching class detail:", error);
        throw error;
    }
};

// --- Siswa ---
export const tambahSiswa = async (siswaData) => {
    try {
        const response = await fetch(`${API_URL}/siswa`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(siswaData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menambah siswa');
        }
        return await response.json();
    } catch (error) {
        console.error("Error adding student:", error);
        throw error;
    }
};

export const daftarkanSiswaKeKelas = async (idKelas, idSiswa) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${idKelas}/daftarkan_siswa`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify({ id_siswa: idSiswa })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mendaftarkan siswa ke kelas');
        }
        return await response.json();
    } catch (error) {
        console.error("Error enrolling student to class:", error);
        throw error;
    }
};

export const updateSiswa = async (idSiswa, siswaData) => {
    try {
        const response = await fetch(`${API_URL}/siswa/${idSiswa}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(siswaData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memperbarui siswa');
        }
        return await response.json();
    } catch (error) {
        console.error("Error updating student:", error);
        throw error;
    }
};

export const deleteSiswa = async (idSiswa) => {
    try {
        const response = await fetch(`${API_URL}/siswa/${idSiswa}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghapus siswa');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting student:", error);
        throw error;
    }
};

// --- Absensi ---
export const catatAbsensi = async (idKelas, absensiData) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${idKelas}/absensi`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(absensiData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mencatat absensi');
        }
        return await response.json();
    } catch (error) {
        console.error("Error recording attendance:", error);
        throw error;
    }
};

export const getAbsensi = async (idKelas, tanggal) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${idKelas}/absensi?tanggal=${tanggal}`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat absensi');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching attendance:", error);
        throw error;
    }
};

// --- NEW: BULK IMPORT SISWA ---
export const bulkImportSiswa = async (kelasId, studentsData) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${kelasId}/siswa/bulk-import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(studentsData)
        });

        const data = await response.json();
        if (!response.ok) {
            // Handle specific backend error messages
            throw new Error(data.message || 'Gagal mengimpor siswa massal');
        }
        return data; // Mengembalikan pesan sukses, success_count, fail_count, dll.
    } catch (error) {
        console.error("Error bulk importing students:", error);
        throw error;
    }
};