// frontend/src/pages/RppGeneratorPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateRppFromAI, simpanRpp } from '../api/aiService'; // Pastikan generateRppFromAI dan simpanRpp diimpor
import { getKelas } from '../api/classroomService'; // Untuk mendapatkan daftar kelas untuk pilihan simpan RPP
import ReactMarkdown from 'react-markdown'; // Untuk render markdown
import {
    Container, Grid, Paper, Typography, Button, Box,
    TextField, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert, IconButton, Tooltip,
    Divider,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Pastikan ini diimpor

function RppGeneratorPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Form states
    const [selectedKelasUntukGenerateId, setSelectedKelasUntukGenerateId] = useState(''); // ID kelas yang dipilih untuk GENERATE
    // mapel dan jenjang akan diambil dari objek kelas yang dipilih
    const [topik, setTopik] = useState('');
    const [alokasiWaktu, setAlokasiWaktu] = useState('');
    const [fileReferens, setFileReferens] = useState(null); // State untuk file
    const [pendekatanPedagogis, setPendekatanPedagogis] = useState(''); // State baru sesuai backend

    // Result and loading states
    const [generatedRpp, setGeneratedRpp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // Save RPP dialog states
    const [openSaveDialog, setOpenSaveDialog] = useState(false);
    const [rppTitle, setRppTitle] = useState('');
    const [selectedKelasUntukSimpanId, setSelectedKelasUntukSimpanId] = useState(''); // ID kelas yang dipilih untuk SIMPAN
    const [daftarKelas, setDaftarKelas] = useState([]); // Untuk dropdown pilihan kelas (baik untuk generate maupun simpan)

    // Load daftar kelas saat komponen dimuat
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const classes = await getKelas(); // Memuat daftar kelas dari backend
                setDaftarKelas(classes);
                // Set default selected class jika datang dari halaman daftar kelas
                if (location.state && location.state.kelasData) {
                    setSelectedKelasUntukGenerateId(location.state.kelasData.id);
                    setSelectedKelasUntukSimpanId(location.state.kelasData.id); // Default untuk simpan juga
                }
            } catch (error) {
                console.error("Error fetching classes:", error);
                showSnackbar('Gagal memuat daftar kelas.', 'error');
            }
        };
        fetchClasses();
    }, [location.state]);


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

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setFileReferens(file);
            showSnackbar(`File '${file.name}' siap diunggah.`, 'info');
        } else {
            setFileReferens(null);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setGeneratedRpp(''); // Clear previous RPP

        if (!selectedKelasUntukGenerateId || !topik || !alokasiWaktu) {
            showSnackbar('Mohon lengkapi semua field yang wajib diisi (Kelas, Topik, Alokasi Waktu).', 'warning');
            setIsLoading(false);
            return;
        }

        try {
            // Dapatkan detail kelas yang dipilih
            const selectedClass = daftarKelas.find(k => k.id === selectedKelasUntukGenerateId);
            if (!selectedClass) {
                showSnackbar('Kelas yang dipilih tidak valid.', 'error');
                setIsLoading(false);
                return;
            }

            // PENTING: Membuat string jenjang yang lebih spesifik untuk AI
            // Contoh output: "SD Kelas 1A", "SMP Kelas 7B"
            const jenjangForAI = `${selectedClass.jenjang} Kelas ${selectedClass.nama_kelas}`; 

            const dataToGenerate = {
                mapel: selectedClass.mata_pelajaran, // Ambil dari objek kelas
                jenjang: jenjangForAI, // Menggunakan string jenjang yang lebih spesifik
                topik,
                alokasi_waktu: alokasiWaktu,
                file: fileReferens, // Kirim objek File
                pendekatan_pedagogis: pendekatanPedagogis, // Kirim parameter baru
            };

            const response = await generateRppFromAI(dataToGenerate); // Memanggil AI Service
            setGeneratedRpp(response.rpp);
            showSnackbar('RPP berhasil dibuat!', 'success');
        } catch (error) {
            console.error('Error generating RPP:', error);
            showSnackbar(error.message || 'Gagal membuat RPP. Silakan coba lagi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSaveDialog = () => {
        if (!generatedRpp) {
            showSnackbar('Tidak ada RPP yang dihasilkan untuk disimpan.', 'warning');
            return;
        }
        // Atur judul RPP default berdasarkan topik, jenjang, dan mapel dari kelas yang digunakan untuk generate
        const generatedFromClass = daftarKelas.find(k => k.id === selectedKelasUntukGenerateId);
        if (generatedFromClass) {
            setRppTitle(`RPP ${topik} (${generatedFromClass.mata_pelajaran} - ${generatedFromClass.jenjang} ${generatedFromClass.nama_kelas})`); // Perbarui judul default
        } else {
            setRppTitle(`RPP ${topik}`);
        }
        
        setOpenSaveDialog(true);
    };

    const handleCloseSaveDialog = () => {
        setOpenSaveDialog(false);
    };

    const handleSaveRpp = async () => {
        if (!rppTitle || !selectedKelasUntukSimpanId) {
            showSnackbar('Judul RPP dan Kelas wajib diisi.', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            await simpanRpp({ // Memanggil AI Service untuk menyimpan RPP
                judul: rppTitle,
                konten_markdown: generatedRpp,
                kelas_id: selectedKelasUntukSimpanId
            });
            showSnackbar('RPP berhasil disimpan ke perpustakaan!', 'success');
            handleCloseSaveDialog();
        } catch (error) {
            console.error('Error saving RPP:', error);
            showSnackbar(error.message || 'Gagal menyimpan RPP.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const pendekatanOptions = [
        'Konvensional (Teacher-Centered)',
        'Student-Centered Learning (SCL)',
        'Project-Based Learning (PBL)',
        'Problem-Based Learning (PBL)',
        'Discovery Learning',
        'Inquiry-Based Learning',
        'Cooperative Learning',
        'Contextual Teaching and Learning (CTL)',
        'Pendekatan Ilmiah (Scientific Approach)',
        'Blended Learning',
        'Diferensiasi Pembelajaran'
    ];


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
                <AutoFixHighIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Generator RPP Kurikulum Merdeka
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom align="center">
                Buat RPP Otomatis dengan Bantuan AI
            </Typography>
            <Divider sx={{ mb: 4 }} />

            <Grid container spacing={4}>
                {/* Kolom Kiri: Form Input RPP */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                            Detail RPP
                        </Typography>
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Dropdown untuk memilih Kelas */}
                            <FormControl fullWidth required>
                                <InputLabel>Pilih Kelas</InputLabel>
                                <Select
                                    value={selectedKelasUntukGenerateId}
                                    label="Pilih Kelas"
                                    onChange={(e) => setSelectedKelasUntukGenerateId(e.target.value)}
                                >
                                    <MenuItem value="">Pilih Kelas...</MenuItem>
                                    {daftarKelas.map((kelas) => (
                                        <MenuItem key={kelas.id} value={kelas.id}>
                                            {kelas.nama_kelas} ({kelas.jenjang} - {kelas.mata_pelajaran})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            {/* Jenjang dan Mata Pelajaran akan Otomatis dari Kelas yang Dipilih */}
                            {selectedKelasUntukGenerateId && daftarKelas.find(k => k.id === selectedKelasUntukGenerateId) && (
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <TextField
                                        fullWidth
                                        label="Jenjang"
                                        value={daftarKelas.find(k => k.id === selectedKelasUntukGenerateId)?.jenjang || ''}
                                        disabled
                                        InputLabelProps={{ shrink: true }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="Mata Pelajaran"
                                        value={daftarKelas.find(k => k.id === selectedKelasUntukGenerateId)?.mata_pelajaran || ''}
                                        disabled
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>
                            )}

                            <TextField
                                fullWidth
                                label="Topik / Judul Materi Pokok"
                                value={topik}
                                onChange={(e) => setTopik(e.target.value)}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Alokasi Waktu (contoh: 2 x 45 menit)"
                                value={alokasiWaktu}
                                onChange={(e) => setAlokasiWaktu(e.target.value)}
                                required
                            />
                            {/* Indikator Pembelajaran dan Tujuan Pembelajaran DIHAPUS, akan digenerate AI */}
                            
                            <FormControl fullWidth>
                                <InputLabel>Pendekatan Pedagogis (Opsional)</InputLabel>
                                <Select
                                    value={pendekatanPedagogis}
                                    label="Pendekatan Pedagogis (Opsional)"
                                    onChange={(e) => setPendekatanPedagogis(e.target.value)}
                                >
                                    <MenuItem value="">Pilih Pendekatan</MenuItem>
                                    {pendekatanOptions.map((approach) => (
                                        <MenuItem key={approach} value={approach}>{approach}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Unggah File Referensi (PDF/DOCX/TXT - Opsional)
                                    <Tooltip title="Unggah materi pembelajaran, buku, atau referensi lain yang akan menjadi dasar pembuatan RPP. AI akan memprioritaskan konten dari file ini.">
                                        <IconButton size="small">
                                            <InfoOutlinedIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Typography>
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<FileUploadIcon />}
                                    fullWidth
                                >
                                    {fileReferens ? fileReferens.name : 'Pilih File'}
                                    <input type="file" hidden onChange={handleFileChange} accept=".pdf,.docx,.txt" />
                                </Button>
                                {fileReferens && (
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                        File: {fileReferens.name} ({Math.round(fileReferens.size / 1024)} KB)
                                    </Typography>
                                )}
                            </Box>
                            
                            <Button
                                type="submit"
                                variant="contained"
                                endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                disabled={isLoading}
                                sx={{ mt: 3, py: 1.5 }}
                            >
                                {isLoading ? 'Membuat RPP...' : 'Buat RPP dengan AI'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Kolom Kanan: Hasil RPP & Aksi */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h2">
                                Hasil RPP
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleOpenSaveDialog}
                                disabled={isLoading || !generatedRpp}
                            >
                                Simpan RPP
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ minHeight: '300px', maxHeight: '70vh', overflowY: 'auto', p: 1, border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                            {isLoading ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <CircularProgress sx={{ mb: 2 }} />
                                    <Typography>AI sedang menyusun RPP Anda...</Typography>
                                </Box>
                            ) : generatedRpp ? (
                                <ReactMarkdown>{generatedRpp}</ReactMarkdown>
                            ) : (
                                <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 5 }}>
                                    RPP yang dihasilkan akan muncul di sini.
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Dialog Simpan RPP */}
            <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Simpan RPP</DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Judul RPP"
                        fullWidth
                        value={rppTitle}
                        onChange={(e) => setRppTitle(e.target.value)}
                        required
                    />
                    <FormControl fullWidth margin="dense" required sx={{ mt: 2 }}>
                        <InputLabel>Pilih Kelas</InputLabel>
                        <Select
                            value={selectedKelasUntukSimpanId}
                            label="Pilih Kelas"
                            onChange={(e) => setSelectedKelasUntukSimpanId(e.target.value)}
                        >
                            <MenuItem value="">
                                <em>None</em>
                            </MenuItem>
                            {daftarKelas.map((kelas) => (
                                <MenuItem key={kelas.id} value={kelas.id}>
                                    {kelas.nama_kelas} ({kelas.jenjang} {kelas.mata_pelajaran})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSaveDialog} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleSaveRpp} variant="contained" disabled={isLoading || !rppTitle || !selectedKelasUntukSimpanId}>
                        {isLoading ? <CircularProgress size={24} /> : 'Simpan'}
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

export default RppGeneratorPage;