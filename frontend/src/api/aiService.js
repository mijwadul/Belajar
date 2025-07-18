// frontend/src/api/aiService.js

import { getAuthHeader } from './authService';

const API_URL = 'http://localhost:5000/api';

// --- FUNGSI BARU UNTUK ANALISIS REFERENSI ---
export const analyzeReference = async (formData) => {
    try {
        const response = await fetch(`${API_URL}/analyze-referensi`, {
            method: 'POST',
            headers: {
                'Authorization': getAuthHeader(),
            },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal menganalisis referensi.');
        }
        return await response.json();
    } catch (error) {
        console.error("Error analyzing reference:", error);
        throw error;
    }
};

// --- FUNGSI-FUNGSI UNTUK RPP ---
export const generateRppFromAI = async (formData) => {
    try {
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

export const downloadRppPdf = async (rppId, rppTitle) => {
    try {
        const response = await fetch(`${API_URL}/rpp/${rppId}/download-pdf`, {
            method: 'GET',
            headers: {
                'Authorization': getAuthHeader(),
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Gagal mengunduh file.');
        }

        // Mengambil blob (binary large object) dari respons
        const blob = await response.blob();
        
        // Membuat URL sementara untuk file blob
        const url = window.URL.createObjectURL(blob);
        
        // Membuat elemen link tersembunyi untuk memicu unduhan
        const link = document.createElement('a');
        link.href = url;
        
        // Membersihkan nama file dari karakter yang tidak valid
        const safeFilename = rppTitle.replace(/[^a-z0-9-_\s]/gi, '_').replace(/ /g, '_');
        link.setAttribute('download', `${safeFilename}.pdf`);
        
        // Menambahkan link ke body, mengkliknya, lalu menghapusnya
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        
        // Melepaskan URL objek setelah selesai
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Download PDF error:", error);
        throw error;
    }
};

// --- FUNGSI-FUNGSI UNTUK SOAL ---
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

// --- FUNGSI-FUNGSI UNTUK UJIAN ---
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

export const getExamById = async (idUjian) => {
    try {
        const response = await fetch(`${API_URL}/ujian/${idUjian}`, {
            headers: {
                'Authorization': getAuthHeader()
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

export const downloadExamPdf = async (examTitle, questions, layoutSettings = {}) => {
    try {
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            throw new Error('Data soal tidak valid atau kosong untuk diunduh.');
        }
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

        if (!response.ok) {
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
        return { message: 'PDF berhasil diunduh' };
    } catch (error) {
        console.error("Error downloading exam PDF:", error);
        throw error;
    }
};