// frontend/src/pages/AttendancePage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom'; // Menggunakan RouterLink
import { getKelasDetail, catatAbsensi, getAbsensi } from '../api/classroomService';
import { utils, writeFile } from 'xlsx';

import {
    Container, Box, Typography, Button, CircularProgress, Alert, Snackbar,
    Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Paper // Import Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function AttendancePage() {
    const { id } = useParams();
    const [kelas, setKelas] = useState(null);
    const [siswaList, setSiswaList] = useState([]);
    const [kehadiran, setKehadiran] = useState({});
    const [tanggalLihat, setTanggalLihat] = useState(new Date().toISOString().split('T')[0]);
    const [riwayatAbsensi, setRiwayatAbsensi] = useState([]);
    const [pesanRiwayat, setPesanRiwayat] = useState("Pilih tanggal dan klik tampilkan.");
    
    // State for Material-UI Dialog
    const [modalIsOpen, setModalIsOpen] = useState(false); // Mengganti nama state agar tetap sama fungsinya
    
    // State for Snackbar Notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [isLoading, setIsLoading] = useState(false); // Untuk loading umum

    useEffect(() => {
        const muatData = async () => {
            setIsLoading(true);
            try {
                const detail = await getKelasDetail(id);
                setKelas(detail);
                setSiswaList(detail.siswa);
            } catch (error) {
                console.error("Gagal memuat data:", error);
                showSnackbar('Gagal memuat data kelas.', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        muatData();
    }, [id]);

    const showSnackbar = (message, severity) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const bukaModalAbsensi = () => {
        const initialKehadiran = {};
        siswaList.forEach(siswa => {
            // Coba ambil status dari riwayat jika sudah ada untuk tanggal yang dipilih
            const statusDariRiwayat = riwayatAbsensi.find(item => item.nama_siswa === siswa.nama_lengkap)?.status;
            initialKehadiran[siswa.id] = statusDariRiwayat || 'Hadir'; // Default 'Hadir' jika belum ada
        });
        setKehadiran(initialKehadiran);
        setModalIsOpen(true);
    };

    const tutupModalAbsensi = () => setModalIsOpen(false);

    const handleStatusChange = (idSiswa, status) => {
        setKehadiran(prev => ({ ...prev, [idSiswa]: status }));
    };

    const handleSubmitAbsensi = async () => {
        setIsLoading(true);
        const dataUntukDikirim = {
            kehadiran: Object.entries(kehadiran).map(([id_siswa, status]) => ({
                id_siswa: parseInt(id_siswa),
                status: status
            })),
            tanggal: tanggalLihat // Mengirim tanggal yang sedang dilihat
        };
        
        try {
            await catatAbsensi(id, dataUntukDikirim);
            showSnackbar('Absensi berhasil disimpan!', 'success');
            tutupModalAbsensi();
            handleLihatAbsensi(); // Perbarui riwayat setelah menyimpan
        } catch (error) {
            console.error(error);
            showSnackbar('Gagal menyimpan absensi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLihatAbsensi = async () => {
        setIsLoading(true);
        try {
            const data = await getAbsensi(id, tanggalLihat);
            setRiwayatAbsensi(data);
            setPesanRiwayat(data.length === 0 ? "Tidak ada data absensi untuk tanggal ini." : "");
        } catch (error) {
            console.error("Gagal memuat riwayat:", error);
            setRiwayatAbsensi([]);
            setPesanRiwayat("Gagal memuat data riwayat.");
            showSnackbar('Gagal memuat riwayat absensi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnduhAbsensi = () => {
        if (riwayatAbsensi.length === 0) {
            showSnackbar("Tidak ada data untuk diunduh. Silakan tampilkan riwayat terlebih dahulu.", "warning");
            return;
        }

        const tanggalTerformat = new Date(tanggalLihat).toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const dataUntukExcel = riwayatAbsensi.map((item, index) => ({
            'No.': index + 1,
            'Tanggal': tanggalTerformat,
            'Nama Siswa': item.nama_siswa,
            'Status Kehadiran': item.status
        }));
        
        const worksheet = utils.json_to_sheet(dataUntukExcel);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Absensi");
        
        writeFile(workbook, `Absensi_${kelas.nama_kelas}_${tanggalLihat}.xlsx`);
        showSnackbar('Riwayat absensi berhasil diunduh!', 'success');
    };

    if (isLoading && !kelas) { // Only show full page loader if initial class data is loading
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Memuat data kelas...</Typography>
            </Container>
        );
    }

    if (!kelas) {
        return <Typography sx={{ mt: 4, ml: 4 }}>Kelas tidak ditemukan.</Typography>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <RouterLink to={`/kelas/${kelas.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="outlined" startIcon={<ArrowBackIcon />}>
                        Kembali ke Detail Kelas
                    </Button>
                </RouterLink>
                <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
                    Absensi Kelas: {kelas.nama_kelas}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    {kelas.mata_pelajaran} ({kelas.jenjang})
                </Typography>
            </Box>
            
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Button 
                    variant="contained" 
                    onClick={bukaModalAbsensi} 
                    disabled={siswaList.length === 0 || isLoading}
                >
                    Ambil Absensi Hari Ini
                </Button>
                {siswaList.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Tambahkan siswa terlebih dahulu untuk mengambil absensi.
                    </Typography>
                )}
            </Paper>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                    Lihat dan Unduh Riwayat Absensi
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <TextField
                        type="date"
                        value={tanggalLihat}
                        onChange={(e) => setTanggalLihat(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                    <Button variant="contained" onClick={handleLihatAbsensi} disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Tampilkan'}
                    </Button>
                    <Button 
                        variant="outlined" 
                        startIcon={<FileDownloadIcon />}
                        onClick={handleUnduhAbsensi} 
                        disabled={riwayatAbsensi.length === 0 || isLoading} 
                    >
                        Unduh Riwayat (.xlsx)
                    </Button>
                </Box>

                {isLoading && riwayatAbsensi.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                        <CircularProgress />
                    </Box>
                ) : riwayatAbsensi.length > 0 ? (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>No.</TableCell>
                                    <TableCell>Nama Siswa</TableCell>
                                    <TableCell>Status Kehadiran</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {riwayatAbsensi.map((absensi, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{absensi.nama_siswa}</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold' }}>{absensi.status}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {pesanRiwayat}
                    </Typography>
                )}
            </Paper>

            {/* Material-UI Dialog for Absensi */}
            <Dialog open={modalIsOpen} onClose={tutupModalAbsensi} maxWidth="md" fullWidth>
                <DialogTitle>Absensi untuk Tanggal: {new Date(tanggalLihat).toLocaleDateString('id-ID')}</DialogTitle>
                <DialogContent dividers>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nama Siswa</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {siswaList.map(siswa => (
                                    <TableRow key={siswa.id}>
                                        <TableCell>{siswa.nama_lengkap}</TableCell>
                                        <TableCell>
                                            <FormControl component="fieldset">
                                                <RadioGroup
                                                    row
                                                    name={`status-${siswa.id}`}
                                                    value={kehadiran[siswa.id] || 'Hadir'}
                                                    onChange={(e) => handleStatusChange(siswa.id, e.target.value)}
                                                >
                                                    <FormControlLabel value="Hadir" control={<Radio size="small" />} label="Hadir" />
                                                    <FormControlLabel value="Sakit" control={<Radio size="small" />} label="Sakit" />
                                                    <FormControlLabel value="Izin" control={<Radio size="small" />} label="Izin" />
                                                    <FormControlLabel value="Alfa" control={<Radio size="small" />} label="Alfa" />
                                                </RadioGroup>
                                            </FormControl>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={tutupModalAbsensi} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleSubmitAbsensi} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Simpan Absensi'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default AttendancePage;