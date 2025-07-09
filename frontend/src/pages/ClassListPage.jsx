// frontend/src/pages/ClassListPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// Pastikan import getKelas, tambahKelas, updateKelas, dan deleteKelas ada
import { getKelas, tambahKelas, updateKelas, deleteKelas } from '../api/classroomService';
import { // Tambah import yang diperlukan
    Container, Grid, Paper, Typography, Button, Box,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Select, MenuItem, FormControl, InputLabel,
    List, ListItem, ListItemText, IconButton,
    Snackbar, Alert, CircularProgress,
    InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import SubjectIcon from '@mui/icons-material/Subject';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

function ClassListPage() {
    const [daftarKelas, setDaftarKelas] = useState([]);
    const [kelasTerpilih, setKelasTerpilih] = useState(null);
    
    // State for Add Class Dialog Form
    const [openAddDialog, setOpenAddDialog] = useState(false); // Ubah nama state agar tidak bentrok
    const [namaKelasBaru, setNamaKelasBaru] = useState('');
    const [jenjangBaru, setJenjangBaru] = useState('SD'); 
    const [mapelBaru, setMapelBaru] = useState('');
    const [tahunAjaranBaru, setTahunAjaranBaru] = useState('');

    // State for Edit Class Dialog
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [kelasUntukDiedit, setKelasUntukDiedit] = useState(null);

    // State for Filter and Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterJenjang, setFilterJenjang] = useState('');
    const [filterMataPelajaran, setFilterMataPelajaran] = useState('');

    // State for Snackbar Notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

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

    // Fungsi untuk memuat data kelas dengan parameter filter
    const muatDataKelas = useCallback(async () => {
        setIsLoading(true);
        try {
            // Memastikan nama fungsi di classroomService.js adalah getKelas
            const data = await getKelas(searchQuery, filterJenjang, filterMataPelajaran);
            setDaftarKelas(data);
            setKelasTerpilih(null); // Reset pilihan kelas saat data di-refresh
        } catch (error) {
            console.error('Gagal memuat data kelas:', error);
            showSnackbar('Gagal memuat data kelas.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, filterJenjang, filterMataPelajaran]);

    useEffect(() => {
        muatDataKelas();
    }, [muatDataKelas]);

    // --- Add Class Handlers ---
    const handleOpenAddDialog = () => {
        setOpenAddDialog(true);
    };

    const handleCloseAddDialog = () => {
        setOpenAddDialog(false);
        setNamaKelasBaru('');
        setJenjangBaru('SD');
        setMapelBaru('');
        setTahunAjaranBaru('');
    };

    const handleTambahKelas = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await tambahKelas({ 
                nama_kelas: namaKelasBaru, 
                jenjang: jenjangBaru,
                mata_pelajaran: mapelBaru,
                tahun_ajaran: tahunAjaranBaru 
            });
            showSnackbar('Kelas berhasil ditambahkan!', 'success');
            handleCloseAddDialog();
            muatDataKelas();
        } catch (error) {
            console.error('Gagal menambah kelas:', error);
            showSnackbar(error.message || 'Gagal menambah kelas. Silakan coba lagi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Edit Class Handlers ---
    const handleOpenEditDialog = (kelas) => {
        setKelasUntukDiedit(kelas);
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
        setKelasUntukDiedit(null);
    };

    const handleEditFormChange = (e) => {
        setKelasUntukDiedit({ ...kelasUntukDiedit, [e.target.name]: e.target.value });
    };

    const handleUpdateKelas = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Pastikan nama fungsi di classroomService.js adalah updateKelas
            await updateKelas(kelasUntukDiedit.id, kelasUntukDiedit);
            showSnackbar('Kelas berhasil diperbarui!', 'success');
            handleCloseEditDialog();
            muatDataKelas(); // Refresh list kelas
        } catch (error) {
            console.error('Gagal memperbarui kelas:', error);
            showSnackbar(error.message || 'Gagal memperbarui kelas. Silakan coba lagi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Delete Class Handler ---
    const handleDeleteKelas = async (idKelas, namaKelas) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus kelas "${namaKelas}"? Aksi ini tidak dapat dibatalkan dan akan menghapus semua siswa, absensi, RPP, dan soal yang terkait dengan kelas ini.`)) {
            setIsLoading(true);
            try {
                // Pastikan nama fungsi di classroomService.js adalah deleteKelas
                await deleteKelas(idKelas);
                showSnackbar(`Kelas "${namaKelas}" berhasil dihapus.`, 'success');
                muatDataKelas(); // Refresh list kelas
            } catch (error) {
                console.error('Gagal menghapus kelas:', error);
                showSnackbar(error.message || 'Gagal menghapus kelas. Silakan coba lagi.', 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // --- Search and Filter Handlers ---
    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleFilterJenjangChange = (event) => {
        setFilterJenjang(event.target.value);
    };

    const handleFilterMataPelajaranChange = (event) => {
        setFilterMataPelajaran(event.target.value);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setFilterJenjang('');
        setFilterMataPelajaran('');
    };

    // Opsi filter Jenjang
    const jenjangOptions = ['SD', 'SMP', 'SMA'];
    // Opsi filter Mata Pelajaran (Contoh, bisa diambil dari backend jika dinamis)
    const mataPelajaranOptions = ['Matematika', 'Bahasa Indonesia', 'IPA', 'IPS', 'Bahasa Inggris', 'Seni Budaya'];

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Manajemen Kelas
            </Typography>

            <Grid container spacing={3}>
                {/* Kolom Kiri: Daftar Kelas & Tombol Tambah Kelas */}
                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h2">
                                Daftar Kelas
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={handleOpenAddDialog} // Ubah ini
                                disabled={isLoading}
                            >
                                Tambah Kelas Baru
                            </Button>
                        </Box>

                        {/* Search and Filter Section */}
                        <Box sx={{ mb: 3 }}>
                            <TextField
                                fullWidth
                                label="Cari Kelas / Mata Pelajaran"
                                variant="outlined"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searchQuery && (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setSearchQuery('')} edge="end">
                                                <ClearIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 2 }}
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel>Jenjang</InputLabel>
                                        <Select
                                            value={filterJenjang}
                                            onChange={handleFilterJenjangChange}
                                            label="Jenjang"
                                        >
                                            <MenuItem value="">Semua Jenjang</MenuItem>
                                            {jenjangOptions.map((jenjang) => (
                                                <MenuItem key={jenjang} value={jenjang}>{jenjang}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                    <FormControl fullWidth variant="outlined">
                                        <InputLabel>Mata Pelajaran</InputLabel>
                                        <Select
                                            value={filterMataPelajaran}
                                            onChange={handleFilterMataPelajaranChange}
                                            label="Mata Pelajaran"
                                        >
                                            <MenuItem value="">Semua Mapel</MenuItem>
                                            {mataPelajaranOptions.map((mapel) => (
                                                <MenuItem key={mapel} value={mapel}>{mapel}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                { (searchQuery || filterJenjang || filterMataPelajaran) && (
                                    <Grid item xs={12}>
                                        <Button 
                                            fullWidth 
                                            variant="outlined" 
                                            onClick={handleResetFilters} 
                                            startIcon={<ClearIcon />}
                                        >
                                            Reset Filter
                                        </Button>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                        {/* End Search and Filter Section */}
                        
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                <CircularProgress />
                            </Box>
                        ) : daftarKelas.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
                                { (searchQuery || filterJenjang || filterMataPelajaran) ? 
                                    "Tidak ada kelas yang cocok dengan kriteria pencarian/filter Anda." :
                                    "Belum ada kelas. Silakan tambahkan kelas baru."
                                }
                            </Typography>
                        ) : (
                            <List>
                                {daftarKelas.map((kelas) => (
                                    <ListItem
                                        key={kelas.id}
                                        button
                                        onClick={() => setKelasTerpilih(kelas)}
                                        selected={kelasTerpilih?.id === kelas.id}
                                        sx={{ borderRadius: '8px', mb: 1 }}
                                    >
                                        <ListItemText
                                            primary={`${kelas.nama_kelas} - ${kelas.mata_pelajaran}`}
                                            secondary={`${kelas.jenjang} (${kelas.tahun_ajaran})`}
                                        />
                                        {/* Hubungkan aksi Edit/Delete */}
                                        <IconButton edge="end" aria-label="edit" onClick={(e) => { e.stopPropagation(); handleOpenEditDialog(kelas); }}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" aria-label="delete" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteKelas(kelas.id, kelas.nama_kelas); }}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>

                {/* Kolom Kanan: Detail Kelas & Tombol Aksi */}
                <Grid item xs={12} md={7}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        {kelasTerpilih ? (
                            <Box>
                                <Typography variant="h5" component="h2" gutterBottom>
                                    Detail Kelas: {kelasTerpilih.nama_kelas}
                                </Typography>
                                <Typography variant="body1">
                                    <SchoolIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    <strong>Jenjang:</strong> {kelasTerpilih.jenjang}
                                </Typography>
                                <Typography variant="body1">
                                    <SubjectIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    <strong>Mata Pelajaran:</strong> {kelasTerpilih.mata_pelajaran}
                                </Typography>
                                <Typography variant="body1" sx={{ mb: 2 }}>
                                    <CalendarTodayIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    <strong>Tahun Ajaran:</strong> {kelasTerpilih.tahun_ajaran}
                                </Typography>
                                <hr />
                                <Typography variant="h6" component="h3" gutterBottom sx={{ mt: 3 }}>
                                    Aksi
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    <Button
                                        variant="contained"
                                        onClick={() => navigate(`/kelas/${kelasTerpilih.id}`)}
                                    >
                                        Kelola Siswa
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate(`/kelas/${kelasTerpilih.id}/absensi`)}
                                    >
                                        Absensi
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/generator-rpp', { state: { kelasData: kelasTerpilih } })}
                                    >
                                        Buat RPP untuk Kelas Ini
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadFileIcon />}
                                        disabled // Sementara dinonaktifkan
                                    >
                                        Unggah Siswa via Excel
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <Typography variant="h6" color="text.secondary">
                                    Pilih sebuah kelas untuk melihat detail
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            {/* Dialog Tambah Kelas Baru */}
            <Dialog open={openAddDialog} onClose={handleCloseAddDialog}> {/* Ubah nama state open */}
                <DialogTitle>Tambah Kelas Baru</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleTambahKelas} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            fullWidth
                            label="Nama Kelas (cth: 5A)"
                            value={namaKelasBaru}
                            onChange={(e) => setNamaKelasBaru(e.target.value)}
                            required
                        />
                        <FormControl fullWidth required>
                            <InputLabel id="jenjang-label">Jenjang</InputLabel>
                            <Select
                                labelId="jenjang-label"
                                value={jenjangBaru}
                                label="Jenjang"
                                onChange={(e) => setJenjangBaru(e.target.value)}
                            >
                                <MenuItem value="SD">SD</MenuItem>
                                <MenuItem value="SMP">SMP</MenuItem>
                                <MenuItem value="SMA">SMA</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            fullWidth
                            label="Mata Pelajaran"
                            value={mapelBaru}
                            onChange={(e) => setMapelBaru(e.target.value)}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Tahun Ajaran"
                            value={tahunAjaranBaru}
                            onChange={(e) => setTahunAjaranBaru(e.target.value)}
                            required
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleTambahKelas} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Tambah Kelas'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Edit Kelas */}
            <Dialog open={openEditDialog} onClose={handleCloseEditDialog}>
                <DialogTitle>Edit Kelas</DialogTitle>
                <DialogContent>
                    {kelasUntukDiedit && ( // Render hanya jika kelasUntukDiedit ada
                        <Box component="form" onSubmit={handleUpdateKelas} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Nama Kelas"
                                name="nama_kelas"
                                value={kelasUntukDiedit.nama_kelas || ''}
                                onChange={handleEditFormChange}
                                fullWidth
                                variant="outlined"
                                required
                            />
                            <FormControl fullWidth margin="dense" required>
                                <InputLabel>Jenjang</InputLabel>
                                <Select
                                    name="jenjang"
                                    value={kelasUntukDiedit.jenjang || ''}
                                    label="Jenjang"
                                    onChange={handleEditFormChange}
                                >
                                    <MenuItem value="SD">SD</MenuItem>
                                    <MenuItem value="SMP">SMP</MenuItem>
                                    <MenuItem value="SMA">SMA</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                margin="dense"
                                label="Mata Pelajaran"
                                name="mata_pelajaran"
                                value={kelasUntukDiedit.mata_pelajaran || ''}
                                onChange={handleEditFormChange}
                                fullWidth
                                variant="outlined"
                                required
                            />
                            <TextField
                                margin="dense"
                                label="Tahun Ajaran"
                                name="tahun_ajaran"
                                value={kelasUntukDiedit.tahun_ajaran || ''}
                                onChange={handleEditFormChange}
                                fullWidth
                                variant="outlined"
                                required
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleUpdateKelas} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Simpan Perubahan'}
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

export default ClassListPage;