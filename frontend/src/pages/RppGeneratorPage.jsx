import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { generateRppFromAI, simpanRpp, analyzeReference } from '../api/aiService';
import { getKelas } from '../api/classroomService';
import ReactMarkdown from 'react-markdown';
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
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

function RppGeneratorPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const [selectedKelasUntukGenerateId, setSelectedKelasUntukGenerateId] = useState('');
    const [topik, setTopik] = useState('');
    const [alokasiWaktu, setAlokasiWaktu] = useState('2 x 45 menit');
    const [fileReferensList, setFileReferensList] = useState([]);

    const [generatedRpp, setGeneratedRpp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const [analysisOpen, setAnalysisOpen] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [openSaveDialog, setOpenSaveDialog] = useState(false);
    const [rppTitle, setRppTitle] = useState('');
    const [selectedKelasUntukSimpanId, setSelectedKelasUntukSimpanId] = useState('');
    const [daftarKelas, setDaftarKelas] = useState([]);

    const showSnackbar = useCallback((message, severity) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    }, []);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const classes = await getKelas();
                setDaftarKelas(classes);
                if (location.state?.kelasData) {
                    setSelectedKelasUntukGenerateId(location.state.kelasData.id);
                    setSelectedKelasUntukSimpanId(location.state.kelasData.id);
                }
            } catch (error) {
                console.error("Error fetching classes:", error);
                showSnackbar('Gagal memuat daftar kelas.', 'error');
            }
        };
        fetchClasses();
    }, [location.state, showSnackbar]);

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const handleFileChange = (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
            setFileReferensList(prev => [...prev, ...files]);
            showSnackbar(`${files.length} file berhasil ditambahkan.`, 'info');
        }
    };

    const handleRemoveFile = (indexToRemove) => {
        setFileReferensList(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const handleAnalyzeReferences = async () => {
        if (fileReferensList.length === 0) {
            showSnackbar('Silakan unggah minimal satu file referensi.', 'warning');
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const formData = new FormData();
            fileReferensList.forEach((file) => formData.append('file', file));
            const data = await analyzeReference(formData);
            setAnalysisResult(data);
            setAnalysisOpen(true);
        } catch (error) {
            showSnackbar(error.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applyAnalysis = () => {
        if (!analysisResult) return;
        setTopik(prev => analysisResult.materi_pokok || prev);
        // Anda bisa menambahkan field lain di sini jika ada di form, misal: setTujuanPembelajaran(analysisResult.tp)
        setAnalysisOpen(false);
        showSnackbar('Data dari referensi berhasil diterapkan ke formulir.', 'success');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setGeneratedRpp('');

        if (!selectedKelasUntukGenerateId || !topik || !alokasiWaktu) {
            showSnackbar('Mohon lengkapi semua field yang wajib diisi (Kelas, Topik, Alokasi Waktu).', 'warning');
            setIsLoading(false);
            return;
        }

        try {
            const selectedClass = daftarKelas.find(k => k.id === selectedKelasUntukGenerateId);
            if (!selectedClass) {
                showSnackbar('Kelas yang dipilih tidak valid.', 'error');
                setIsLoading(false);
                return;
            }

            const jenjangForAI = `${selectedClass.jenjang} Kelas ${selectedClass.nama_kelas}`;
            const formData = new FormData();
            formData.append('mapel', selectedClass.mata_pelajaran);
            formData.append('jenjang', jenjangForAI);
            formData.append('topik', topik);
            formData.append('alokasi_waktu', alokasiWaktu);
            fileReferensList.forEach((file) => formData.append('file_paths', file));

            const response = await generateRppFromAI(formData);
            setGeneratedRpp(response.rpp);
            showSnackbar('RPP berhasil dibuat!', 'success');
        } catch (error) {
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
        const generatedFromClass = daftarKelas.find(k => k.id === selectedKelasUntukGenerateId);
        if (generatedFromClass) {
            setRppTitle(`RPP ${topik} (${generatedFromClass.mata_pelajaran} - ${generatedFromClass.jenjang})`);
        } else {
            setRppTitle(`RPP ${topik}`);
        }
        setOpenSaveDialog(true);
    };

    const handleCloseSaveDialog = () => setOpenSaveDialog(false);

    const handleSaveRpp = async () => {
        if (!rppTitle || !selectedKelasUntukSimpanId) {
            showSnackbar('Judul RPP dan Kelas wajib diisi.', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            await simpanRpp({
                judul: rppTitle,
                konten_markdown: generatedRpp,
                kelas_id: selectedKelasUntukSimpanId
            });
            showSnackbar('RPP berhasil disimpan ke perpustakaan!', 'success');
            handleCloseSaveDialog();
        } catch (error) {
            showSnackbar(error.message || 'Gagal menyimpan RPP.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

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
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h5" component="h2" gutterBottom>Detail RPP</Typography>
                        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Pilih Kelas</InputLabel>
                                <Select value={selectedKelasUntukGenerateId} label="Pilih Kelas" onChange={(e) => setSelectedKelasUntukGenerateId(e.target.value)}>
                                    <MenuItem value="">Pilih Kelas...</MenuItem>
                                    {daftarKelas.map((kelas) => (
                                        <MenuItem key={kelas.id} value={kelas.id}>
                                            {`${kelas.nama_kelas} (${kelas.jenjang} - ${kelas.mata_pelajaran})`}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Topik / Judul Materi Pokok" value={topik} onChange={(e) => setTopik(e.target.value)} required />
                            <TextField fullWidth label="Alokasi Waktu" value={alokasiWaktu} onChange={(e) => setAlokasiWaktu(e.target.value)} required />
                            
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Unggah File Referensi (Opsional)
                                    <Tooltip title="Unggah materi pembelajaran (PDF/DOCX/TXT/JPG/PNG) untuk membantu AI memahami konteks.">
                                        <IconButton size="small"><InfoOutlinedIcon fontSize="small" /></IconButton>
                                    </Tooltip>
                                </Typography>
                                <Button variant="outlined" component="label" startIcon={<FileUploadIcon />} fullWidth>
                                    Tambah File
                                    <input type="file" hidden multiple onChange={handleFileChange} accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" />
                                </Button>
                                {fileReferensList.length > 0 && (
                                    <Box sx={{ mt: 1 }}>
                                        {fileReferensList.map((file, idx) => (
                                            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>{`${file.name} (${Math.round(file.size / 1024)} KB)`}</Typography>
                                                <Button size="small" color="error" onClick={() => handleRemoveFile(idx)}>Hapus</Button>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                                <Button variant="contained" color="secondary" sx={{ mt: 2 }} onClick={handleAnalyzeReferences} disabled={isAnalyzing || fileReferensList.length === 0}>
                                    {isAnalyzing ? <CircularProgress size={24} /> : 'Proses Referensi'}
                                </Button>
                            </Box>
                            
                            <Button type="submit" variant="contained" endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />} disabled={isLoading} sx={{ mt: 3, py: 1.5 }}>
                                {isLoading ? 'Membuat RPP...' : 'Buat RPP dengan AI'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h2">Hasil RPP</Typography>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleOpenSaveDialog} disabled={isLoading || !generatedRpp}>
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

            <Dialog open={analysisOpen} onClose={() => setAnalysisOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Hasil Analisis Referensi</DialogTitle>
                <DialogContent dividers>
                    {isAnalyzing ? <CircularProgress /> : analysisResult ? (
                        <Box>
                            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                                {JSON.stringify(analysisResult, null, 2)}
                            </pre>
                            <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={applyAnalysis}>
                                Gunakan Data Ini untuk Mengisi Form
                            </Button>
                        </Box>
                    ) : <Typography>Tidak ada hasil.</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAnalysisOpen(false)} color="primary">Tutup</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openSaveDialog} onClose={handleCloseSaveDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Simpan RPP</DialogTitle>
                <DialogContent dividers>
                    <TextField autoFocus margin="dense" label="Judul RPP" fullWidth value={rppTitle} onChange={(e) => setRppTitle(e.target.value)} required />
                    <FormControl fullWidth margin="dense" required sx={{ mt: 2 }}>
                        <InputLabel>Pilih Kelas untuk Menyimpan</InputLabel>
                        <Select value={selectedKelasUntukSimpanId} label="Pilih Kelas untuk Menyimpan" onChange={(e) => setSelectedKelasUntukSimpanId(e.target.value)}>
                            {daftarKelas.map((kelas) => (
                                <MenuItem key={kelas.id} value={kelas.id}>
                                    {`${kelas.nama_kelas} (${kelas.jenjang} - ${kelas.mata_pelajaran})`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSaveDialog}>Batal</Button>
                    <Button onClick={handleSaveRpp} variant="contained" disabled={isLoading || !rppTitle || !selectedKelasUntukSimpanId}>
                        {isLoading ? <CircularProgress size={24} /> : 'Simpan'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default RppGeneratorPage;