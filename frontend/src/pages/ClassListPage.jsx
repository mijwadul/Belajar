import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKelas, tambahKelas } from '../api/classroomService';

function ClassListPage() {
    const [daftarKelas, setDaftarKelas] = useState([]);
    const [kelasTerpilih, setKelasTerpilih] = useState(null);
    
    const [namaKelasBaru, setNamaKelasBaru] = useState('');
    const [jenjangBaru, setJenjangBaru] = useState('SD'); 
    const [mapelBaru, setMapelBaru] = useState('');
    const [tahunAjaranBaru, setTahunAjaranBaru] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        muatDataKelas();
    }, []);

    const muatDataKelas = async () => {
        try {
            const data = await getKelas();
            setDaftarKelas(data);
        } catch (error) {
            console.error('Gagal memuat data kelas:', error);
        }
    };
    
    const handleTambahKelas = async (e) => {
        e.preventDefault();
        try {
            await tambahKelas({ 
                nama_kelas: namaKelasBaru, 
                jenjang: jenjangBaru,
                mata_pelajaran: mapelBaru,
                tahun_ajaran: tahunAjaranBaru 
            });
            // Reset form
            setNamaKelasBaru('');
            setJenjangBaru('SD');
            setMapelBaru('');
            setTahunAjaranBaru('');
            muatDataKelas();
        } catch (error) {
            console.error('Gagal menambah kelas:', error);
        }
    };

    return (
        <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
            {/* Kolom Kiri: Daftar Kelas & Form Tambah Kelas */}
            <div style={{ width: '40%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
                <h2>Manajemen Kelas</h2>
                <form onSubmit={handleTambahKelas} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input type="text" placeholder="Nama Kelas (cth: 5A)" value={namaKelasBaru} onChange={(e) => setNamaKelasBaru(e.target.value)} required />
                    <select value={jenjangBaru} onChange={(e) => setJenjangBaru(e.target.value)}>
                        <option value="SD">SD</option>
                        <option value="SMP">SMP</option>
                        <option value="SMA">SMA</option>
                    </select>
                    <input type="text" placeholder="Mata Pelajaran" value={mapelBaru} onChange={(e) => setMapelBaru(e.target.value)} required />
                    <input type="text" placeholder="Tahun Ajaran" value={tahunAjaranBaru} onChange={(e) => setTahunAjaranBaru(e.target.value)} required />
                    <button type="submit">Tambah Kelas</button>
                </form>
                <hr />
                <h3>Pilih Kelas</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {daftarKelas.map((kelas) => (
                        <li 
                            key={kelas.id} 
                            onClick={() => setKelasTerpilih(kelas)} 
                            style={{ 
                                cursor: 'pointer', 
                                padding: '8px', 
                                backgroundColor: kelasTerpilih?.id === kelas.id ? '#e0e0e0' : 'transparent' 
                            }}
                        >
                            {kelas.nama_kelas} - {kelas.mata_pelajaran} ({kelas.jenjang})
                        </li>
                    ))}
                </ul>
            </div>

            {/* Kolom Kanan: Detail Kelas & Tombol Aksi */}
            <div style={{ width: '60%', padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}>
                {kelasTerpilih ? (
                    <div>
                        <h2>Detail Kelas: {kelasTerpilih.nama_kelas}</h2>
                        <p><strong>Jenjang:</strong> {kelasTerpilih.jenjang}</p>
                        <p><strong>Mata Pelajaran:</strong> {kelasTerpilih.mata_pelajaran}</p>
                        <p><strong>Tahun Ajaran:</strong> {kelasTerpilih.tahun_ajaran}</p>
                        <hr/>
                        <h3>Aksi</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <button onClick={() => navigate(`/kelas/${kelasTerpilih.id}/siswa`)}>Kelola Siswa</button>
                            <button onClick={() => navigate(`/kelas/${kelasTerpilih.id}/absensi`)}>Absensi</button>
                            <button onClick={() => navigate('/generator-rpp', { state: { kelasData: kelasTerpilih } })}>
                                Buat RPP untuk Kelas Ini
                            </button>
                        </div>
                    </div>
                ) : (
                    <h2>Pilih sebuah kelas untuk melihat detail</h2>
                )}
            </div>
        </div>
    );
}

export default ClassListPage;