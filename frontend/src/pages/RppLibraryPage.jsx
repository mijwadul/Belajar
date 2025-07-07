// frontend/src/pages/RppLibraryPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllRpps } from '../api/aiService';

function RppLibraryPage() {
    const [rppList, setRppList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const muatData = async () => {
            try {
                const data = await getAllRpps();
                setRppList(data);
            } catch (error) {
                console.error("Gagal memuat RPP:", error);
            } finally {
                setIsLoading(false);
            }
        };
        muatData();
    }, []);

    if (isLoading) {
        return <p>Memuat perpustakaan RPP...</p>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Perpustakaan RPP</h1>
            <p>Berikut adalah daftar semua RPP yang pernah Anda simpan.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Judul RPP</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Kelas Terkait</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Tanggal Dibuat</th>
                    </tr>
                </thead>
                <tbody>
                    {rppList.length > 0 ? (
                        rppList.map(rpp => (
                            <tr key={rpp.id}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                    <Link to={`/rpp/${rpp.id}`}>{rpp.judul}</Link>
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{rpp.nama_kelas}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{rpp.tanggal_dibuat}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '10px' }}>Perpustakaan masih kosong.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default RppLibraryPage;