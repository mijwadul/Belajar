import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getKelasDetail, tambahSiswa, daftarkanSiswaKeKelas, updateSiswa, deleteSiswa } from '../api/classroomService';
import Modal from 'react-modal';

Modal.setAppElement('#root');

function StudentManagementPage() {
    const { id } = useParams();
    const [kelas, setKelas] = useState(null);
    const [daftarSiswa, setDaftarSiswa] = useState([]);
    
    const initialFormState = {
        nama_lengkap: '', nisn: '', nis: '', tempat_lahir: '', tanggal_lahir: '',
        jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: '', nomor_hp: ''
    };
    const [formSiswa, setFormSiswa] = useState(initialFormState);

    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [siswaUntukDiedit, setSiswaUntukDiedit] = useState(null);

    useEffect(() => {
        muatDetailKelas();
    }, [id]);

    const muatDetailKelas = async () => {
        try {
            const detail = await getKelasDetail(id);
            setKelas(detail);
            setDaftarSiswa(detail.siswa);
        } catch (error) {
            console.error("Gagal memuat detail kelas:", error);
        }
    };

    const handleFormSiswaChange = (e) => {
        setFormSiswa({ ...formSiswa, [e.target.name]: e.target.value });
    };

    const handleTambahSiswa = async (e) => {
        e.preventDefault();
        try {
            const responsSiswa = await tambahSiswa(formSiswa);
            await daftarkanSiswaKeKelas(id, responsSiswa.id_siswa);
            alert(`Siswa "${formSiswa.nama_lengkap}" berhasil ditambahkan!`);
            muatDetailKelas();
            setFormSiswa(initialFormState); // Reset form
        } catch (error) {
            console.error('Gagal menambah siswa:', error);
            alert('Gagal menambahkan siswa.');
        }
    };

    const bukaModalEdit = (siswa) => {
        // Format tanggal untuk input type="date"
        const tgl = siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '';
        setSiswaUntukDiedit({ ...siswa, tanggal_lahir: tgl });
        setModalIsOpen(true);
    };
    
    const tutupModalEdit = () => setModalIsOpen(false);

    const handleUpdateSiswa = async (e) => {
        e.preventDefault();
        try {
            await updateSiswa(siswaUntukDiedit.id, siswaUntukDiedit);
            alert('Data siswa berhasil diperbarui!');
            tutupModalEdit();
            muatDetailKelas();
        } catch (error) {
            console.error(error);
            alert('Gagal memperbarui data siswa.');
        }
    };

    const handleHapusSiswa = async (idSiswa, namaSiswa) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${namaSiswa}"?`)) {
            try {
                await deleteSiswa(idSiswa);
                alert('Siswa berhasil dihapus.');
                muatDetailKelas();
            } catch (error) {
                console.error(error);
                alert('Gagal menghapus siswa.');
            }
        }
    };

    if (!kelas) return <p>Memuat data kelas...</p>;

    return (
        <div style={{ padding: '20px' }}>
            <Link to="/">&larr; Kembali ke Daftar Kelas</Link>
            <h1>Manajemen Siswa: {kelas.nama_kelas}</h1>
            <p>{kelas.mata_pelajaran} ({kelas.jenjang})</p>

            <div style={{ display: 'flex', gap: '20px' }}>
                {/* Kolom Kiri: Form Tambah Siswa */}
                <div style={{ width: '40%' }}>
                    <h3>Tambah Siswa Baru</h3>
                    <form onSubmit={handleTambahSiswa} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input name="nama_lengkap" placeholder="Nama Lengkap" value={formSiswa.nama_lengkap} onChange={handleFormSiswaChange} required />
                        <input name="nisn" placeholder="NISN" value={formSiswa.nisn} onChange={handleFormSiswaChange} />
                        <input name="nis" placeholder="NIS" value={formSiswa.nis} onChange={handleFormSiswaChange} />
                        <input name="tempat_lahir" placeholder="Tempat Lahir" value={formSiswa.tempat_lahir} onChange={handleFormSiswaChange} />
                        <input type="date" name="tanggal_lahir" value={formSiswa.tanggal_lahir} onChange={handleFormSiswaChange} />
                        <select name="jenis_kelamin" value={formSiswa.jenis_kelamin} onChange={handleFormSiswaChange}><option>Laki-laki</option><option>Perempuan</option></select>
                        <select name="agama" value={formSiswa.agama} onChange={handleFormSiswaChange}><option>Islam</option><option>Kristen Protestan</option><option>Kristen Katolik</option><option>Hindu</option><option>Buddha</option><option>Konghucu</option></select>
                        <textarea name="alamat" placeholder="Alamat Lengkap" value={formSiswa.alamat} onChange={handleFormSiswaChange}></textarea>
                        <input name="nomor_hp" placeholder="Nomor HP Siswa" value={formSiswa.nomor_hp} onChange={handleFormSiswaChange} />
                        <button type="submit">Tambahkan Siswa</button>
                    </form>
                </div>

                {/* Kolom Kanan: Daftar Siswa */}
                <div style={{ width: '60%' }}>
                    <h3>Daftar Siswa di Kelas Ini ({daftarSiswa.length} siswa)</h3>
                    {daftarSiswa.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {daftarSiswa.map(siswa => (
                                <li key={siswa.id} style={{ marginBottom: '10px', padding: '5px', borderBottom: '1px solid #eee' }}>
                                    {siswa.nama_lengkap} (NISN: {siswa.nisn || 'N/A'})
                                    <div style={{ marginTop: '5px' }}>
                                        <button onClick={() => bukaModalEdit(siswa)}>Edit</button>
                                        <button onClick={() => handleHapusSiswa(siswa.id, siswa.nama_lengkap)} style={{ marginLeft: '5px' }}>Hapus</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : ( <p>Belum ada siswa di kelas ini.</p> )}
                </div>
            </div>

            {/* Modal untuk Edit Siswa */}
            <Modal 
    isOpen={modalIsOpen} 
    onRequestClose={tutupModalEdit} 
    contentLabel="Edit Siswa"
    style={{ content: { top: '50%', left: '50%', right: 'auto', bottom: 'auto', marginRight: '-50%', transform: 'translate(-50%, -50%)', width: '500px' } }}
>
    {siswaUntukDiedit && (
        <form onSubmit={handleUpdateSiswa} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h2>Edit Data: {siswaUntukDiedit.nama_lengkap}</h2>
            
            <label>Nama Lengkap</label>
            <input name="nama_lengkap" value={siswaUntukDiedit.nama_lengkap} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nama_lengkap: e.target.value})} required />
            
            <label>NISN</label>
            <input name="nisn" placeholder="NISN" value={siswaUntukDiedit.nisn || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nisn: e.target.value})} />
            
            <label>NIS</label>
            <input name="nis" placeholder="NIS" value={siswaUntukDiedit.nis || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nis: e.target.value})} />
            
            <label>Tempat Lahir</label>
            <input name="tempat_lahir" placeholder="Tempat Lahir" value={siswaUntukDiedit.tempat_lahir || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, tempat_lahir: e.target.value})} />
            
            <label>Tanggal Lahir</label>
            <input type="date" name="tanggal_lahir" value={siswaUntukDiedit.tanggal_lahir} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, tanggal_lahir: e.target.value})} />
            
            <label>Jenis Kelamin</label>
            <select name="jenis_kelamin" value={siswaUntukDiedit.jenis_kelamin || 'Laki-laki'} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, jenis_kelamin: e.target.value})}>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
            </select>
            
            <label>Agama</label>
            <select name="agama" value={siswaUntukDiedit.agama || 'Islam'} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, agama: e.target.value})}>
                <option>Islam</option>
                <option>Kristen Protestan</option>
                <option>Kristen Katolik</option>
                <option>Hindu</option>
                <option>Buddha</option>
                <option>Konghucu</option>
            </select>
            
            <label>Alamat Lengkap</label>
            <textarea name="alamat" placeholder="Alamat Lengkap" value={siswaUntukDiedit.alamat || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, alamat: e.target.value})}></textarea>
            
            <label>Nomor HP Siswa</label>
            <input name="nomor_hp" placeholder="Nomor HP Siswa" value={siswaUntukDiedit.nomor_hp || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nomor_hp: e.target.value})} />

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
                <button type="submit">Simpan Perubahan</button>
                <button type="button" onClick={tutupModalEdit} style={{ marginLeft: '10px' }}>Batal</button>
            </div>
        </form>
    )}
</Modal>
        </div>
    );
}

export default StudentManagementPage;