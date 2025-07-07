// frontend/src/api/aiService.js

const API_URL = 'http://127.0.0.1:5000/api';

// Fungsi untuk men-generate RPP dari AI
export const generateRpp = async (dataRpp) => {
    const data = new FormData();
    for (const key in dataRpp) {
        if (key !== 'file') {
            data.append(key, dataRpp[key]);
        }
    }
    if (dataRpp.file) {
        data.append('file', dataRpp.file);
    }

    const response = await fetch(`${API_URL}/generate-rpp`, {
        method: 'POST',
        body: data,
    });
    if (!response.ok) {
        throw new Error('Gagal membuat RPP dari AI');
    }
    return response.json();
};

// Fungsi untuk menyimpan RPP yang sudah di-generate
export const saveRpp = async (dataRpp) => {
    const response = await fetch(`${API_URL}/rpp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataRpp),
    });
    if (!response.ok) throw new Error('Gagal menyimpan RPP');
    return response.json();
};

// Fungsi untuk mengambil semua RPP dari perpustakaan
export const getAllRpps = async () => {
    const response = await fetch(`${API_URL}/rpp`);
    if (!response.ok) throw new Error('Gagal mengambil daftar RPP');
    return response.json();
};

// Fungsi untuk mengambil detail satu RPP berdasarkan ID
export const getRppById = async (id) => {
    const response = await fetch(`${API_URL}/rpp/${id}`);
    if (!response.ok) throw new Error('Gagal mengambil detail RPP');
    return response.json();
};

export const generateSoal = async (params) => {
    const response = await fetch(`${API_URL}/generate-soal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!response.ok) throw new Error('Gagal membuat soal');
    return response.json();
};

export const saveSoal = async (dataSoal) => {
    const response = await fetch(`${API_URL}/soal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataSoal),
    });
    if (!response.ok) throw new Error('Gagal menyimpan soal');
    return response.json();
};

export const getAllSoal = async () => {
    const response = await fetch(`${API_URL}/soal`);
    if (!response.ok) throw new Error('Gagal mengambil bank soal');
    return response.json();
};

export const getSoalById = async (id) => {
    const response = await fetch(`${API_URL}/soal/${id}`);
    if (!response.ok) throw new Error('Gagal mengambil detail soal');
    return response.json();
};