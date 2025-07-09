// frontend/src/api/aiService.js

import { getAuthHeader } from './authService'; // Import fungsi untuk mendapatkan header otorisasi

const API_URL = 'http://localhost:5000/api'; // Sesuaikan jika API Anda berjalan di port atau domain lain

// --- Fungsi untuk menghasilkan RPP dari AI ---
export const generateRppFromAI = async (data) => {
    try {
        const formData = new FormData();
        formData.append('mapel', data.mapel);
        formData.append('jenjang', data.jenjang);
        formData.append('topik', data.topik);
        formData.append('alokasi_waktu', data.alokasi_waktu);
        if (data.file) {
            formData.append('file', data.file);
        }
        if (data.pendekatan_pedagogis) {
            formData.append('pendekatan_pedagogis', data.pendekatan_pedagogis);
        }

        const response = await fetch(`${API_URL}/generate-rpp`, {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeader()
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghasilkan RPP dari AI.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating RPP from AI:", error);
        throw error;
    }
};

// --- Fungsi untuk menyimpan RPP ---
export const simpanRpp = async (rppData) => {
    try {
        const response = await fetch(`${API_URL}/rpp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(rppData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan RPP');
        }
        return await response.json();
    } catch (error) {
        console.error("Error saving RPP:", error);
        throw error;
    }
};

// --- NEW: Fungsi untuk mendapatkan semua RPP ---
export const getAllRpps = async () => {
    try {
        const response = await fetch(`${API_URL}/rpp`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat daftar RPP');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching all RPPs:", error);
        throw error;
    }
};

// --- NEW: Fungsi untuk mendapatkan RPP berdasarkan ID ---
export const getRppById = async (idRpp) => {
    try {
        const response = await fetch(`${API_URL}/rpp/${idRpp}`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memuat RPP dengan ID ${idRpp}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching RPP with ID ${idRpp}:`, error);
        throw error;
    }
};

// --- Fungsi untuk menghasilkan soal dari AI ---
export const generateSoalFromAI = async (data) => {
    try {
        const response = await fetch(`${API_URL}/generate-soal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menghasilkan soal dari AI.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error generating Soal from AI:", error);
        throw error;
    }
};

// --- Fungsi untuk menyimpan Soal ---
export const simpanSoal = async (soalData) => {
    try {
        const response = await fetch(`${API_URL}/soal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(soalData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan soal');
        }
        return await response.json();
    } catch (error) {
        console.error("Error saving Soal:", error);
        throw error;
    }
};

// --- NEW: Fungsi untuk mendapatkan semua Soal ---
export const getAllSoal = async () => {
    try {
        const response = await fetch(`${API_URL}/soal`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat daftar soal');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching all Soal:", error);
        throw error;
    }
};

// --- NEW: Fungsi untuk mendapatkan Soal berdasarkan ID ---
export const getSoalById = async (idSoal) => {
    try {
        const response = await fetch(`${API_URL}/soal/${idSoal}`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memuat soal dengan ID ${idSoal}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching Soal with ID ${idSoal}:`, error);
        throw error;
    }
};

// --- NEW: Fungsi untuk menghapus Soal berdasarkan ID ---
export const deleteSoal = async (idSoal) => {
    try {
        const response = await fetch(`${API_URL}/soal/${idSoal}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal menghapus soal dengan ID ${idSoal}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting Soal with ID ${idSoal}:`, error);
        throw error;
    }
};

export const downloadExamPdf = async (examTitle, questionsData) => {
    try {
        const response = await fetch(`${API_URL}/generate-exam-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify({
                exam_title: examTitle,
                questions: questionsData // Kirim array objek soal lengkap
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mengunduh ujian PDF.');
        }

        // Tangani respons file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${examTitle.replace(/[^a-z0-9]/gi, '_') || 'Ujian'}.pdf`; // Nama file
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); // Bersihkan URL objek

        return { message: 'Ujian PDF berhasil diunduh!' };
    } catch (error) {
        console.error("Error downloading exam PDF:", error);
        throw error;
    }
};