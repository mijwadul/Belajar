import React, { useState, useEffect } from 'react';
import { getAllRpps, generateSoal, saveSoal } from '../api/aiService';
// Impor untuk unduh (docx, file-saver) sudah dihapus

function QuizGeneratorPage() {
    const [rppList, setRppList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedSoal, setGeneratedSoal] = useState([]);
    const [judulSoal, setJudulSoal] = useState('');
    
    const [params, setParams] = useState({
        rpp_id: '',
        jenis_soal: 'Pilihan Ganda',
        jumlah_soal: 5,
        tingkat_kesulitan: 'C2 - Memahami'
    });

    useEffect(() => {
        const muatRpp = async () => {
            try {
                const data = await getAllRpps();
                setRppList(data);
            } catch (error) {
                console.error("Gagal memuat RPP di Generator Soal:", error);
            }
        };
        muatRpp();
    }, []);

    const handleChange = (e) => {
        setParams({ ...params, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setGeneratedSoal([]);
        try {
            const result = await generateSoal(params);
            setGeneratedSoal(result.soal || []);
            const rppTerpilih = rppList.find(r => r.id.toString() === params.rpp_id);
            if (rppTerpilih) {
                setJudulSoal(`Soal Kuis - ${rppTerpilih.judul}`);
            }
        } catch (error) {
            console.error(error);
            alert("Gagal membuat soal.");
        }
        setIsLoading(false);
    };

    const handleSimpanSoal = async () => {
        if (!judulSoal) return alert("Beri judul untuk set soal ini.");
        try {
            await saveSoal({
                judul: judulSoal,
                konten_json: generatedSoal,
                rpp_id: params.rpp_id
            });
            alert("Set soal berhasil disimpan di Bank Soal!");
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan soal.");
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Generator Soal Otomatis</h2>
            <p>Pilih RPP dan atur parameter untuk dibuatkan soal oleh AI.</p>
            
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
                <select name="rpp_id" value={params.rpp_id} onChange={handleChange} required>
                    <option value="">-- Pilih RPP dari Perpustakaan --</option>
                    {rppList.map(rpp => (
                        <option key={rpp.id} value={rpp.id}>{rpp.judul}</option>
                    ))}
                </select>

                <label>Jenis Soal:</label>
                <select name="jenis_soal" value={params.jenis_soal} onChange={handleChange}>
                    <option>Pilihan Ganda</option>
                    <option>Esai Singkat</option>
                </select>

                <label>Jumlah Soal:</label>
                <input type="number" name="jumlah_soal" value={params.jumlah_soal} onChange={handleChange} min="1" max="20" />

                <label>Tingkat Kesulitan (Taksonomi Bloom):</label>
                <select name="tingkat_kesulitan" value={params.tingkat_kesulitan} onChange={handleChange}>
                    <option>C1 - Mengingat</option>
                    <option>C2 - Memahami</option>
                    <option>C3 - Menerapkan</option>
                    <option>C4 - Menganalisis</option>
                    <option>C5 - Mengevaluasi</option>
                </select>

                <button type="submit" disabled={isLoading || !params.rpp_id}>
                    {isLoading ? 'Membuat Soal...' : 'Buat Soal'}
                </button>
            </form>

            <hr />
            <h3>Hasil Soal</h3>
            <div style={{ border: '1px solid #ccc', padding: '15px', background: '#f9f9f9' }}>
                {isLoading ? <p>AI sedang bekerja...</p> : 
                    generatedSoal.length > 0 ? (
                        <ol>
                            {generatedSoal.map((item, index) => (
                                <li key={index} style={{ marginBottom: '15px' }}>
                                    <p>{item.pertanyaan}</p>
                                    {item.pilihan && (
                                        <ul style={{ listStyleType: 'upper-alpha' }}>
                                            {Object.entries(item.pilihan).map(([key, value]) => ( <li key={key}>{value}</li> ))}
                                        </ul>
                                    )}
                                    <p><strong>Jawaban:</strong> {item.jawaban_benar || item.jawaban_ideal}</p>
                                </li>
                            ))}
                        </ol>
                    ) : ( <p>Hasil soal akan muncul di sini...</p> )
                }
            </div>

            {generatedSoal.length > 0 && !isLoading && (
                <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #007bff', borderRadius: '8px' }}>
                    <h3>Simpan Set Soal Ini?</h3>
                    <input type="text" value={judulSoal} onChange={(e) => setJudulSoal(e.target.value)} style={{ width: '300px', marginRight: '10px' }} />
                    <button onClick={handleSimpanSoal}>Simpan ke Bank Soal</button>
                </div>
            )}
        </div>
    );
}

export default QuizGeneratorPage;