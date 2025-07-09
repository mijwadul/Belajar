// frontend/src/pages/QuizGeneratorPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRpps, generateSoalFromAI, simpanSoal, getRppById } from '../api/aiService'; // Tambah getRppById
import {
    Container, Grid, Paper, Typography, Button, Box,
    TextField, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert,
    Divider, List, ListItem, ListItemText // <-- Tambahkan impor ini
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SaveIcon from '@mui/icons-material/Save';

function QuizGeneratorPage() {
    const navigate = useNavigate();

    const [selectedRppId, setSelectedRppId] = useState('');
    const [jenisSoal, setJenisSoal] = useState('Pilihan Ganda');
    const [jumlahSoal, setJumlahSoal] = useState(5);
    const [tingkatKesulitan, setTingkatKesulitan] = useState('Mudah');
    const [generatedSoal, setGeneratedSoal] = useState(null); // Akan menyimpan objek JSON hasil soal
    const [daftarRpps, setDaftarRpps] = useState([]); // Untuk dropdown RPP
    const [isLoading, setIsLoading] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // Fetch all RPPs for the dropdown
    useEffect(() => {
        const fetchRpps = async () => {
            try {
                const rpps = await getAllRpps();
                // Untuk dropdown, hanya perlu id, judul, nama_kelas. Konten RPP diambil saat generate soal.
                setDaftarRpps(rpps); 
            } catch (error) {
                console.error("Error fetching RPPs:", error);
                showSnackbar('Gagal memuat daftar RPP.', 'error');
            }
        };
        fetchRpps();
    }, []);

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

    const handleSubmitSoal = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setGeneratedSoal(null); // Clear previous soal

        if (!selectedRppId || !jenisSoal || !jumlahSoal || !tingkatKesulitan) {
            showSnackbar('Mohon lengkapi semua field.', 'warning');
            setIsLoading(false);
            return;
        }

        try {
            // Ambil konten RPP secara lengkap menggunakan getRppById
            const rppDetail = await getRppById(selectedRppId); // Menggunakan getRppById
            const sumberMateri = rppDetail.konten_markdown; // Ambil konten_markdown

            const dataToGenerate = {
                sumber_materi: sumberMateri,
                jenis_soal: jenisSoal,
                jumlah_soal: jumlahSoal,
                tingkat_kesulitan: tingkatKesulitan,
            };

            const response = await generateSoalFromAI(dataToGenerate);
            // Pastikan response.soal adalah array of objects
            setGeneratedSoal(response); // Asumsi respons adalah objek JSON seperti {soal: [...]}
            showSnackbar('Soal berhasil dibuat!', 'success');
        } catch (error) {
            console.error('Error generating Soal:', error);
            showSnackbar(error.message || 'Gagal membuat soal. Silakan coba lagi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSoal = async () => {
        if (!generatedSoal || !selectedRppId) {
            showSnackbar('Tidak ada soal yang dihasilkan atau RPP belum dipilih.', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const rppTerpilih = daftarRpps.find(rpp => rpp.id === selectedRppId);
            const judulSoal = `Soal ${jenisSoal} ${jumlahSoal} (${tingkatKesulitan}) - ${rppTerpilih.judul}`;

            await simpanSoal({
                judul: judulSoal,
                konten_json: generatedSoal, // Asumsi ini adalah objek JSON
                rpp_id: selectedRppId
            });
            showSnackbar('Set soal berhasil disimpan ke bank soal!', 'success');
            // Opsional: navigate ke halaman detail soal atau bank soal
            // navigate('/bank-soal');
        } catch (error) {
            console.error('Error saving Soal:', error);
            showSnackbar(error.message || 'Gagal menyimpan soal.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                <AutoFixHighIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'inherit' }} /> Generator Soal
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom align="center">
                Buat Soal Evaluasi Otomatis dari RPP dengan Bantuan AI
            </Typography>
            <Divider sx={{ my: 4 }} /> {/* Styling Divider */}

            <Grid container spacing={4}>
                {/* Kolom Kiri: Form Input Soal */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}> {/* Styling Paper */}
                        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
                            Detail Soal
                        </Typography>
                        <Box component="form" onSubmit={handleSubmitSoal} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <FormControl fullWidth required margin="normal"> {/* Styling FormControl */}
                                <InputLabel>Pilih RPP</InputLabel>
                                <Select
                                    value={selectedRppId}
                                    label="Pilih RPP"
                                    onChange={(e) => setSelectedRppId(e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Pilih RPP...</em>
                                    </MenuItem>
                                    {daftarRpps.map((rpp) => (
                                        <MenuItem key={rpp.id} value={rpp.id}>
                                            {rpp.judul} ({rpp.nama_kelas})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required margin="normal">
                                <InputLabel>Jenis Soal</InputLabel>
                                <Select
                                    value={jenisSoal}
                                    label="Jenis Soal"
                                    onChange={(e) => setJenisSoal(e.target.value)}
                                >
                                    <MenuItem value="Pilihan Ganda">Pilihan Ganda</MenuItem>
                                    <MenuItem value="Esai Singkat">Esai Singkat</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required margin="normal">
                                <InputLabel>Jumlah Soal</InputLabel>
                                <Select
                                    value={jumlahSoal}
                                    label="Jumlah Soal"
                                    onChange={(e) => setJumlahSoal(e.target.value)}
                                >
                                    {[...Array(10).keys()].map(i => (
                                        <MenuItem key={i + 1} value={i + 1}>{i + 1}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth required margin="normal">
                                <InputLabel>Tingkat Kesulitan</InputLabel>
                                <Select
                                    value={tingkatKesulitan}
                                    label="Tingkat Kesulitan"
                                    onChange={(e) => setTingkatKesulitan(e.target.value)}
                                >
                                    <MenuItem value="Mudah">Mudah</MenuItem>
                                    <MenuItem value="Sedang">Sedang</MenuItem>
                                    <MenuItem value="Sulit">Sulit</MenuItem>
                                </Select>
                            </FormControl>

                            <Button
                                type="submit"
                                variant="contained"
                                endIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />}
                                disabled={isLoading}
                                // Styling Button
                                sx={{ mt: 3, py: 1.5, borderRadius: '8px' }}
                            >
                                {isLoading ? 'Membuat Soal...' : 'Buat Soal dengan AI'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Kolom Kanan: Hasil Soal & Aksi */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}> {/* Styling Paper */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h2">
                                Hasil Soal
                            </Typography>
                            <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveSoal}
                                disabled={isLoading || !generatedSoal}
                                sx={{ borderRadius: '8px' }}
                            >
                                Simpan Soal
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1, minHeight: '300px', maxHeight: '70vh', overflowY: 'auto', p: 1, border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}> {/* Styling Box */}
                            {isLoading ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <CircularProgress sx={{ mb: 2 }} />
                                    <Typography color="text.secondary">AI sedang menyusun soal Anda...</Typography>
                                </Box>
                            ) : generatedSoal ? (
                                <List sx={{ width: '100%' }}> {/* Styling List */}
                                    {generatedSoal.soal.map((soal, index) => (
                                        <ListItem key={index} alignItems="flex-start" sx={{ mb: 2, border: '1px solid #eee', borderRadius: '8px', p: 2 }}> {/* Styling ListItem */}
                                            <ListItemText
                                                primary={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{index + 1}. {soal.pertanyaan}</Typography>}
                                                secondary={
                                                    <>
                                                        {soal.pilihan && (
                                                            <Box component="div" sx={{ my: 1, pl: 2 }}>
                                                                {Object.entries(soal.pilihan).map(([key, value]) => (
                                                                    <Typography key={key} variant="body2" color="text.secondary">
                                                                        {key}. {value}
                                                                    </Typography>
                                                                ))}
                                                            </Box>
                                                        )}
                                                        <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
                                                            Jawaban: {soal.jawaban_benar || soal.jawaban_ideal}
                                                        </Typography>
                                                    </>
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body1" color="text.secondary" align="center" sx={{ mt: 5 }}>
                                    Soal yang dihasilkan akan muncul di sini.
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            {/* Snackbar for Notifications */}
            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default QuizGeneratorPage;