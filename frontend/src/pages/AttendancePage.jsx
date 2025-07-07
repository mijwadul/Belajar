// frontend/src/pages/AttendancePage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getKelasDetail, catatAbsensi, getAbsensi } from '../api/classroomService';
import Modal from 'react-modal';
import { utils, writeFile } from 'xlsx';

Modal.setAppElement('#root');

function AttendancePage() {
    const { id } = useParams();
    const [kelas, setKelas] = useState(null);
    const [siswaList, setSiswaList] = useState([]);
    const [kehadiran, setKehadiran] = useState({});
    const [tanggalLihat, setTanggalLihat] = useState(new Date().toISOString().split('T')[0]);
    const [riwayatAbsensi, setRiwayatAbsensi] = useState([]);
    const [pesanRiwayat, setPesanRiwayat] = useState("Pilih tanggal dan klik tampilkan.");
    const [modalIsOpen, setModalIsOpen] = useState(false);

    useEffect(() => {
        const muatData = async () => {
            try {
                const detail = await getKelasDetail(id);
                setKelas(detail);
                setSiswaList(detail.siswa);
            } catch (error) {
                console.error("Gagal memuat data:", error);
            }
        };
        muatData();
    }, [id]);

    const bukaModalAbsensi = () => {
        const initialKehadiran = {};
        siswaList.forEach(siswa => {
            initialKehadiran[siswa.id] = 'Hadir';
        });
        setKehadiran(initialKehadiran);
        setModalIsOpen(true);
    };

    const tutupModalAbsensi = () => setModalIsOpen(false);

    const handleStatusChange = (idSiswa, status) => {
        setKehadiran(prev => ({ ...prev, [idSiswa]: status }));
    };

    const handleSubmitAbsensi = async () => {
        const dataUntukDikirim = {
            kehadiran: Object.entries(kehadiran).map(([id_siswa, status]) => ({
                id_siswa: parseInt(id_siswa),
                status: status
            }))
        };
        
        try {
            await catatAbsensi(id, dataUntukDikirim);
            alert('Absensi berhasil disimpan!');
            tutupModalAbsensi();
        } catch (error) {
            console.error(error);
            alert('Gagal menyimpan absensi.');
        }
    };

    const handleLihatAbsensi = async () => {
        try {
            const data = await getAbsensi(id, tanggalLihat);
            setRiwayatAbsensi(data);
            setPesanRiwayat(data.length === 0 ? "Tidak ada data untuk tanggal ini." : "");
        } catch (error) {
            console.error("Gagal memuat riwayat:", error);
            setRiwayatAbsensi([]);
            setPesanRiwayat("Gagal memuat data.");
        }
    };

    const handleUnduhAbsensi = () => {
        if (riwayatAbsensi.length === 0) {
            alert("Tidak ada data untuk diunduh. Silakan tampilkan riwayat terlebih dahulu.");
            return;
        }

        // --- PERUBAHAN DI SINI ---
        // 1. Format tanggal menjadi lebih mudah dibaca
        const tanggalTerformat = new Date(tanggalLihat).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        // 2. Tambahkan kolom "Tanggal" pada setiap baris data
        const dataUntukExcel = riwayatAbsensi.map((item, index) => ({
            'No.': index + 1,
            'Tanggal': tanggalTerformat, // Tambahkan tanggal yang sudah diformat
            'Nama Siswa': item.nama_siswa,
            'Status Kehadiran': item.status
        }));
        // -------------------------
        
        const worksheet = utils.json_to_sheet(dataUntukExcel);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Absensi");
        
        writeFile(workbook, `Absensi_${kelas.nama_kelas}_${tanggalLihat}.xlsx`);
    };

    if (!kelas) {
        return <p>Memuat...</p>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <Link to="/">&larr; Kembali ke Daftar Kelas</Link>
            <h1>Absensi Kelas: {kelas.nama_kelas}</h1>
            
            <button onClick={bukaModalAbsensi} disabled={siswaList.length === 0}>
                Ambil Absensi Hari Ini
            </button>
            <p>{siswaList.length === 0 ? 'Tambahkan siswa terlebih dahulu untuk mengambil absensi.' : ''}</p>

            <hr />

            <h3>Lihat dan Unduh Riwayat Absensi</h3>
            <input type="date" value={tanggalLihat} onChange={(e) => setTanggalLihat(e.target.value)} />
            <button onClick={handleLihatAbsensi} style={{ marginLeft: '10px' }}>Tampilkan</button>
            <button onClick={handleUnduhAbsensi} disabled={riwayatAbsensi.length === 0} style={{ marginLeft: '10px' }}>
                Unduh Riwayat (.xlsx)
            </button>

            {riwayatAbsensi.length > 0 ? (
                <ul> {riwayatAbsensi.map((absensi, index) => ( <li key={index}>{absensi.nama_siswa}: <strong>{absensi.status}</strong></li> ))} </ul>
            ) : <p>{pesanRiwayat}</p>}

            <Modal isOpen={modalIsOpen} onRequestClose={tutupModalAbsensi} contentLabel="Modal Absensi" style={{ content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '600px' } }}>
                <h2>Absensi untuk Tanggal: {new Date().toLocaleDateString('id-ID')}</h2>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Nama Siswa</th>
                            <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {siswaList.map(siswa => (
                            <tr key={siswa.id}>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>{siswa.nama_lengkap}</td>
                                <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                                    {['Hadir', 'Sakit', 'Izin', 'Alfa'].map(status => (
                                        <label key={status} style={{ marginRight: '15px' }}>
                                            <input type="radio" name={`status-${siswa.id}`} value={status} checked={kehadiran[siswa.id] === status} onChange={() => handleStatusChange(siswa.id, status)} /> {status}
                                        </label>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={tutupModalAbsensi} style={{ marginRight: '10px' }}>Batal</button>
                    <button onClick={handleSubmitAbsensi}>Simpan Absensi</button>
                </div>
            </Modal>
        </div>
    );
}

export default AttendancePage;