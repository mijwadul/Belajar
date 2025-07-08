import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKelas, tambahKelas } from '../api/classroomService';
import {
    Container, Grid, Paper, Typography, Button, Box,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Select, MenuItem, FormControl, InputLabel,
    List, ListItem, ListItemText, IconButton,
    Snackbar, Alert, CircularProgress // Tambah CircularProgress untuk loading
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SchoolIcon from '@mui/icons-material/School';
import SubjectIcon from '@mui/icons-material/Subject';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit'; // Untuk aksi edit (nantinya)
import DeleteIcon from '@mui/icons-material/Delete'; // Untuk aksi delete (nantinya)
import UploadFileIcon from '@mui/icons-material/UploadFile'; // Untuk ikon upload excel

function ClassListPage() {
    const [daftarKelas, setDaftarKelas] = useState([]);
    const [kelasTerpilih, setKelasTerpilih] = useState(null);
    
    // State for Add Class Dialog Form
    const [openDialog, setOpenDialog] = useState(false);
    const [namaKelasBaru, setNamaKelasBaru] = useState('');
    const [jenjangBaru, setJenjangBaru] = useState('SD'); 
    const [mapelBaru, setMapelBaru] = useState('');
    const [tahunAjaranBaru, setTahunAjaranBaru] = useState('');

    // State for Snackbar Notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [isLoading, setIsLoading] = useState(false); // New state for loading

    const navigate = useNavigate();

    useEffect(() => {
        muatDataKelas();
    }, []);

    const muatDataKelas = async () => {
        setIsLoading(true); // Set loading true when fetching data
        try {
            const data = await getKelas();
            setDaftarKelas(data);
        } catch (error) {
            console.error('Gagal memuat data kelas:', error);
            setSnackbarMessage('Gagal memuat data kelas.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsLoading(false); // Set loading false after fetch
        }
    };
    
    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        // Reset form fields when dialog closes
        setNamaKelasBaru('');
        setJenjangBaru('SD');
        setMapelBaru('');
        setTahunAjaranBaru('');
    };

    const handleTambahKelas = async (e) => {
        e.preventDefault();
        setIsLoading(true); // Set loading true during class creation
        try {
            await tambahKelas({ 
                nama_kelas: namaKelasBaru, 
                jenjang: jenjangBaru,
                mata_pelajaran: mapelBaru,
                tahun_ajaran: tahunAjaranBaru 
            });
            setSnackbarMessage('Kelas berhasil ditambahkan!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleCloseDialog(); // Close dialog on success
            muatDataKelas(); // Reload data
        } catch (error) {
            console.error('Gagal menambah kelas:', error);
            setSnackbarMessage('Gagal menambah kelas. Silakan coba lagi.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsLoading(false); // Set loading false after creation attempt
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

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
                                onClick={handleOpenDialog}
                                disabled={isLoading}
                            >
                                Tambah Kelas Baru
                            </Button>
                        </Box>
                        
                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                <CircularProgress />
                            </Box>
                        ) : daftarKelas.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
                                Belum ada kelas. Silakan tambahkan kelas baru.
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
                                        {/* Placeholder for Edit/Delete actions, will be implemented later */}
                                        <IconButton edge="end" aria-label="edit">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton edge="end" aria-label="delete" color="error">
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
                                        onClick={() => navigate(`/kelas/${kelasTerpilih.id}`)} // Perbaikan: dulu ke /kelas/:id/siswa
                                    >
                                        Kelola Siswa
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate(`/absensi/${kelasTerpilih.id}`)}
                                    >
                                        Absensi
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/generate-rpp', { state: { kelasData: kelasTerpilih } })}
                                    >
                                        Buat RPP untuk Kelas Ini
                                    </Button>
                                    {/* Placeholder for Upload Excel button - will be functional later */}
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadFileIcon />}
                                        // onClick={handleUploadExcel} // Ini akan diimplementasikan nanti
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
            <Dialog open={openDialog} onClose={handleCloseDialog}>
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
                    <Button onClick={handleCloseDialog} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleTambahKelas} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Tambah Kelas'}
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