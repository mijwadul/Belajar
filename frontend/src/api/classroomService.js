// frontend/src/api/classroomService.js

import { getAuthHeader } from './authService';

const API_URL = 'http://localhost:5000/api';

// --- Kelas ---
export const getKelas = async (searchQuery = '', jenjang = '', mataPelajaran = '') => {
    try {
        const params = new URLSearchParams();
        if (searchQuery) {
            params.append('search', searchQuery);
        }
        if (jenjang) {
            params.append('jenjang', jenjang);
        }
        if (mataPelajaran) {
            params.append('mata_pelajaran', mataPelajaran);
        }

        const queryString = params.toString();
        const url = `${API_URL}/kelas${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
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

export const updateKelas = async (idKelas, kelasData) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${idKelas}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(kelasData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memperbarui kelas ID ${idKelas}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating class ID ${idKelas}:`, error);
        throw error;
    }
};

export const deleteKelas = async (idKelas) => {
    try {
        const response = await fetch(`${API_URL}/kelas/${idKelas}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal menghapus kelas ID ${idKelas}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting class ID ${idKelas}:`, error);
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
            throw new Error(data.message || 'Gagal mengimpor siswa massal');
        }
        return data;
    } catch (error) {
        console.error("Error bulk importing students:", error);
        throw error;
    }
};

// --- Fungsi untuk mendapatkan siswa di kelas tertentu dengan pencarian dan filter ---
export const getSiswaByKelas = async (idKelas, searchQuery = '', jenisKelamin = '', agama = '') => {
    try {
        const params = new URLSearchParams();
        if (searchQuery) {
            params.append('search', searchQuery);
        }
        if (jenisKelamin) {
            params.append('jenis_kelamin', jenisKelamin);
        }
        if (agama) {
            params.append('agama', agama);
        }

        const queryString = params.toString();
        const url = `${API_URL}/kelas/${idKelas}/siswa${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memuat siswa untuk kelas ID ${idKelas}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching students for class ID ${idKelas}:`, error);
        throw error;
    }
};

// --- NEW: Fungsi untuk mendapatkan jumlah total siswa (GLOBAL) ---
export const getSiswaTotalCount = async () => {
    try {
        const response = await fetch(`${API_URL}/students/total_count`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat total siswa');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching total students count:", error);
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

export const getAllKelas = async () => {
    try {
        const response = await fetch(`${API_URL}/kelas`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat daftar kelas');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching all Kelas:", error);
        throw error;
    }
};