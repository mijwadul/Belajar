import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateRpp, saveRpp } from '../api/aiService';
import { getKelas } from '../api/classroomService';
import ReactMarkdown from 'react-markdown';

function RppGeneratorPage() {
    const [daftarKelas, setDaftarKelas] = useState([]);
    const [kelasTerpilihId, setKelasTerpilihId] = useState('');
    const [formData, setFormData] = useState({
        mapel: '', jenjang: '', topik: '', alokasi_waktu: '',
    });
    const [file, setFile] = useState(null);
    const [hasilRpp, setHasilRpp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [judulRpp, setJudulRpp] = useState('');

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const muatDataKelas = async () => {
            try {
                const data = await getKelas();
                setDaftarKelas(data);
            } catch (error) {
                console.error("Gagal memuat daftar kelas:", error);
            }
        };
        muatDataKelas();
    }, []);

    useEffect(() => {
        if (location.state && location.state.kelasData) {
            const { kelasData } = location.state;
            const kelasSesuai = daftarKelas.find(k => k.id === kelasData.id);
            if (kelasSesuai) {
                setKelasTerpilihId(kelasSesuai.id.toString());
                setFormData({
                    ...formData,
                    jenjang: `${kelasData.jenjang} / ${kelasData.nama_kelas}`,
                    mapel: kelasData.mata_pelajaran,
                });
            }
        }
    }, [location.state, daftarKelas]);

    const handleKelasChange = (e) => {
        const id = e.target.value;
        setKelasTerpilihId(id);
        const kelasDipilih = daftarKelas.find(k => k.id.toString() === id);
        if (kelasDipilih) {
            setFormData({
                ...formData,
                jenjang: `${kelasDipilih.jenjang} / ${kelasDipilih.nama_kelas}`,
                mapel: kelasDipilih.mata_pelajaran,
            });
        } else {
            setFormData({ ...formData, jenjang: '', mapel: '' });
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setHasilRpp('');
        try {
            const dataUntukDikirim = { ...formData, file: file };
            const respons = await generateRpp(dataUntukDikirim);
            setHasilRpp(respons.rpp);
            setJudulRpp(formData.topik);
        } catch (error) {
            console.error(error);
            alert('Gagal menghasilkan RPP.');
        }
        setIsLoading(false);
    };

    const handleSimpanRpp = async () => {
        if (!judulRpp) return alert('Silakan beri judul untuk RPP ini.');
        try {
            await saveRpp({
                judul: judulRpp,
                konten_markdown: hasilRpp,
                kelas_id: kelasTerpilihId
            });
            alert('RPP berhasil disimpan ke perpustakaan!');
            navigate('/perpustakaan-rpp');
        } catch (error) {
            console.error('Gagal menyimpan RPP:', error);
            alert('Gagal menyimpan RPP.');
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Generator RPP Otomatis</h2>
            <p>Pilih kelas, masukkan detail, dan unggah materi (opsional).</p>
            
            {/* --- BAGIAN FORMULIR YANG HILANG, SEKARANG DIKEMBALIKAN --- */}
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '500px' }}>
                <select onChange={handleKelasChange} value={kelasTerpilihId} required>
                    <option value="">-- Pilih Kelas --</option>
                    {daftarKelas.map(k => (
                        <option key={k.id} value={k.id}>
                            {k.nama_kelas} - {k.mata_pelajaran} ({k.jenjang})
                        </option>
                    ))}
                </select>
                
                <input name="topik" placeholder="Topik/Materi Pokok" value={formData.topik} onChange={handleChange} required />
                <input name="alokasi_waktu" placeholder="Alokasi Waktu (cth: 2x45 Menit)" value={formData.alokasi_waktu} onChange={handleChange} required />
                
                <div>
                    <label>Unggah Materi (PDF/DOCX/JPG, Opsional): </label>
                    <input type="file" onChange={handleFileChange} accept=".pdf,.docx,.png,.jpg,.jpeg" />
                </div>

                <button type="submit" disabled={isLoading || !kelasTerpilihId}>
                    {isLoading ? 'Membuat...' : 'Buat RPP'}
                </button>
            </form>
            {/* ----------------------------------------------------------- */}
            
            <hr />
            <h3>Hasil RPP</h3>
            <div style={{ border: '1px solid #ccc', padding: '15px', background: '#f9f9f9' }}>
                {isLoading ? <p>AI sedang berpikir...</p> : <ReactMarkdown>{hasilRpp || 'Hasil akan muncul di sini...'}</ReactMarkdown>}
            </div>

            {hasilRpp && !isLoading && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #007bff', borderRadius: '8px' }}>
                    <h3>Simpan RPP Ini?</h3>
                    <input 
                        type="text" 
                        placeholder="Beri Judul RPP untuk Disimpan" 
                        value={judulRpp} 
                        onChange={(e) => setJudulRpp(e.target.value)}
                        style={{ width: '300px', marginRight: '10px' }}
                    />
                    <button onClick={handleSimpanRpp}>Simpan ke Perpustakaan</button>
                </div>
            )}
        </div>
    );
}

export default RppGeneratorPage;