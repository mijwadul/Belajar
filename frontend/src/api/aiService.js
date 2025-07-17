// frontend/src/api/aiService.js

import { getAuthHeader } from './authService';

const API_URL = 'http://localhost:5000/api';

// --- Fungsi untuk menghasilkan RPP dari AI ---
export const generateRppFromAI = async (data) => {
    try {
        const formData = new FormData();
        formData.append('mapel', data.mapel);
        formData.append('jenjang', data.jenjang);
        formData.append('topik', data.topik);
        formData.append('alokasi_waktu', data.alokasi_waktu);
        // Support multiple files (data.fileReferensList or data.file_paths)
        if (data.fileReferensList && Array.isArray(data.fileReferensList)) {
            data.fileReferensList.forEach(file => {
                formData.append('file_paths', file);
            });
        } else if (data.file_paths && Array.isArray(data.file_paths)) {
            data.file_paths.forEach(file => {
                formData.append('file_paths', file);
            });
        } else if (data.file) {
            // fallback for single file
            formData.append('file_paths', data.file);
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

// --- NEW FUNCTION: Update RPP ---
export const updateRpp = async (idRpp, rppData) => {
    try {
        const response = await fetch(`${API_URL}/rpp/${idRpp}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(rppData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memperbarui RPP dengan ID ${idRpp}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating RPP with ID ${idRpp}:`, error);
        throw error;
    }
};

// --- NEW FUNCTION: Delete RPP ---
export const deleteRpp = async (idRpp) => {
    try {
        const response = await fetch(`${API_URL}/rpp/${idRpp}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal menghapus RPP dengan ID ${idRpp}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting RPP with ID ${idRpp}:`, error);
        throw error;
    }
};

// --- NEW FUNCTION: Download RPP PDF ---
export const downloadRppPdf = async (idRpp, rppTitle) => {
    try {
        const response = await fetch(`${API_URL}/rpp/${idRpp}/pdf`, {
            method: 'GET', // Menggunakan GET karena hanya mengambil resource
            headers: {
                'Authorization': getAuthHeader()
            }
        });

        if (!response.ok) {
            // Coba baca pesan error dari backend jika ada, jika tidak, lempar error generik.
            // Perhatikan bahwa response.json() hanya bisa dipanggil sekali.
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Gagal mengunduh RPP PDF untuk ID ${idRpp}.`);
            } else {
                throw new Error(`Gagal mengunduh RPP PDF untuk ID ${idRpp}. Status: ${response.status}`);
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${rppTitle.replace(/[^a-z0-9]/gi, '_') || 'RPP'}.pdf`; // Bersihkan nama file
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url); // Bersihkan URL objek

        return { message: 'RPP PDF berhasil diunduh!' };
    } catch (error) {
        console.error("Error downloading RPP PDF:", error);
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

export const downloadExamPdf = async (examTitle, questions, layoutSettings = {}) => {
    try {
        // Validasi questionsData
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            throw new Error('Data soal tidak valid atau kosong untuk diunduh.');
        }
        // Pastikan layoutSettings adalah objek, jika tidak, inisialisasi sebagai objek kosong
        if (!layoutSettings || typeof layoutSettings !== 'object') {
            layoutSettings = {}; 
        }

        const response = await fetch(`${API_URL}/generate-exam-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify({ 
                exam_title: examTitle, 
                questions: questions,
                layout: layoutSettings 
            }),
        });

        // Periksa status respons sebelum mencoba membaca blob
        if (!response.ok) {
            // Coba baca pesan error dari backend jika ada, jika tidak, lempar error generik.
            // Perhatikan bahwa response.json() hanya bisa dipanggil sekali.
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mengunduh PDF ujian.');
            } else {
                throw new Error(`Gagal mengunduh PDF ujian. Status: ${response.status}`);
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${examTitle.replace(/[^a-zA-Z0-9]/g, '_')}_ujian.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return { message: 'PDF berhasil diunduh' }; // Berikan pesan sukses
    } catch (error) {
        console.error("Error downloading exam PDF:", error);
        throw error;
    }
};

// NEW: Fungsi untuk mendapatkan semua Ujian
export const getAllExams = async () => {
    try {
        const response = await fetch(`${API_URL}/ujian`, {
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal memuat daftar ujian');
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching all Exams:", error);
        throw error;
    }
};

// NEW: Fungsi untuk mendapatkan Ujian berdasarkan ID (jika diperlukan detail spesifik)
export const getExamById = async (idUjian) => {
    try {
        const authHeader = getAuthHeader();
        const response = await fetch(`${API_URL}/ujian/${idUjian}`, {
            headers: {
                'Authorization': authHeader
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memuat ujian dengan ID ${idUjian}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching Exam with ID ${idUjian}:`, error);
        throw error;
    }
};

// NEW: Fungsi untuk menghapus Ujian berdasarkan ID
export const deleteExam = async (idUjian) => {
    try {
        const response = await fetch(`${API_URL}/ujian/${idUjian}`, {
            method: 'DELETE',
            headers: {
                'Authorization': getAuthHeader()
            }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal menghapus ujian dengan ID ${idUjian}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error deleting Exam with ID ${idUjian}:`, error);
        throw error;
    }
};

// --- Fungsi untuk menyimpan Ujian (dengan tambahan layout) ---
export const saveExam = async (examData) => {
    try {
        const response = await fetch(`${API_URL}/ujian`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getAuthHeader()
            },
            body: JSON.stringify(examData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menyimpan ujian');
        }
        return await response.json();
    } catch (error) {
        console.error("Error saving exam:", error);
        throw error;
    }
};