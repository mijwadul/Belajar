import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSoal } from '../api/aiService';

function BankSoalPage() {
    const [soalList, setSoalList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const muatData = async () => {
            try {
                const data = await getAllSoal();
                setSoalList(data);
            } catch (error) {
                console.error("Gagal memuat bank soal:", error);
            } finally {
                setIsLoading(false);
            }
        };
        muatData();
    }, []);

    if (isLoading) {
        return <p style={{ padding: '20px' }}>Memuat bank soal...</p>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Bank Soal</h1>
            <p>Berikut adalah daftar semua set soal yang pernah Anda simpan. Klik pada judul untuk melihat detail dan mengunduh.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f2f2f2' }}>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Judul Set Soal</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Dibuat dari RPP</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tanggal Dibuat</th>
                    </tr>
                </thead>
                <tbody>
                    {soalList.length > 0 ? (
                        soalList.map(soal => (
                            <tr key={soal.id}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                    <Link to={`/soal/${soal.id}`}>{soal.judul}</Link>
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{soal.judul_rpp}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{soal.tanggal_dibuat}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>Bank Soal masih kosong. Silakan buat soal baru dari halaman "Generator Soal".</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default BankSoalPage;