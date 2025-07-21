// frontend/src/pages/QuizGeneratorPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllRpps, generateSoalFromAI, simpanSoal } from '../api/aiService';
import ReactMarkdown from 'react-markdown';
import {
    Container, Grid, Paper, Typography, Button, Box,
    TextField, Select, MenuItem, FormControl, InputLabel,
    CircularProgress, Snackbar, Alert,
    Divider, List, ListItem, ListItemText, Checkbox, FormControlLabel,
    Card, CardMedia, CardActionArea, Tooltip, Stack
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function QuizGeneratorPage() {
    const navigate = useNavigate();

    // State untuk form input
    const [selectedRppId, setSelectedRppId] = useState('');
    const [jenisSoal, setJenisSoal] = useState('Pilihan Ganda');
    const [jumlahSoal, setJumlahSoal] = useState(5);
    
    // --- PERBAIKAN: Inisialisasi state sebagai array kosong ---
    const [generatedSoal, setGeneratedSoal] = useState([]); 
    const [daftarRpps, setDaftarRpps] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const fetchRpps = async () => {
            try {
                const rpps = await getAllRpps();
                // Pastikan data yang diterima adalah array
                setDaftarRpps(Array.isArray(rpps) ? rpps : []);
            } catch (error) {
                console.error("Error fetching RPPs:", error);
                showSnackbar('Gagal memuat daftar RPP.', 'error');
                setDaftarRpps([]); // Jika error, pastikan state tetap array kosong
            }
        };
        fetchRpps();
    }, []);

    const showSnackbar = (message, severity) => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbar({ ...snackbar, open: false });
    };

    const handleSubmitSoal = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setGeneratedSoal([]);

        if (!selectedRppId) {
            showSnackbar('Mohon pilih RPP terlebih dahulu.', 'warning');
            setIsLoading(false);
            return;
        }

        try {
            const dataToGenerate = {
                rpp_id: selectedRppId,
                jenis_soal: jenisSoal,
                jumlah_soal: jumlahSoal,
            };

            const response = await generateSoalFromAI(dataToGenerate);
            // --- PERBAIKAN: Tambahkan properti 'gambar_terpilih' dan pastikan response adalah array ---
            const soalWithSelection = Array.isArray(response) ? response.map(soal => ({ ...soal, gambar_terpilih: '' })) : [];
            setGeneratedSoal(soalWithSelection);
            showSnackbar('Soal berhasil dibuat!', 'success');
        } catch (error) {
            console.error('Error generating Soal:', error);
            showSnackbar(error.message || 'Gagal membuat soal. Silakan coba lagi.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageSelect = (soalIndex, imageUrl) => {
        const updatedSoal = [...generatedSoal];
        updatedSoal[soalIndex].gambar_terpilih = 
            updatedSoal[soalIndex].gambar_terpilih === imageUrl ? '' : imageUrl;
        setGeneratedSoal(updatedSoal);
    };

    const handleSaveSoal = async () => {
        if (generatedSoal.length === 0 || !selectedRppId) {
            showSnackbar('Tidak ada soal yang dihasilkan untuk disimpan.', 'warning');
            return;
        }
        setIsLoading(true);
        try {
            const rppTerpilih = daftarRpps.find(rpp => rpp.id === selectedRppId);
            const judulSoal = `Soal ${jenisSoal} - ${rppTerpilih ? rppTerpilih.judul : 'dari RPP Pilihan'}`;
            
            // Hapus properti saran_gambar sebelum menyimpan
            const soalToSave = generatedSoal.map(({ saran_gambar, ...rest }) => rest);

            await simpanSoal({
                judul: judulSoal,
                konten_json: { soal: soalToSave }, // Bungkus dalam objek dengan key "soal"
                rpp_id: selectedRppId
            });
            showSnackbar('Set soal berhasil disimpan ke bank soal!', 'success');
            navigate('/bank-soal');
        } catch (error) {
            showSnackbar(`Gagal menyimpan soal: ${error.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
                <AutoFixHighIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Generator Soal
            </Typography>
            <Divider sx={{ my: 4 }} />

            <Grid container spacing={4}>
                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', position: 'sticky', top: '20px' }}>
                        <Typography variant="h5" component="h2" gutterBottom>Detail Soal</Typography>
                        <Box component="form" onSubmit={handleSubmitSoal} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 3 }}>
                           <FormControl fullWidth required>
                                <InputLabel>Pilih RPP</InputLabel>
                                <Select value={selectedRppId} onChange={(e) => setSelectedRppId(e.target.value)} label="Pilih RPP">
                                    {daftarRpps.map((rpp) => (
                                        <MenuItem key={rpp.id} value={rpp.id}>
                                            {rpp.judul}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Jenis Soal</InputLabel>
                                <Select value={jenisSoal} onChange={(e) => setJenisSoal(e.target.value)} label="Jenis Soal">
                                    <MenuItem value="Pilihan Ganda">Pilihan Ganda</MenuItem>
                                    <MenuItem value="Esai Singkat">Esai Singkat</MenuItem>
                                </Select>
                            </FormControl>
                             <TextField
                                label="Jumlah Soal"
                                type="number"
                                value={jumlahSoal}
                                onChange={(e) => setJumlahSoal(parseInt(e.target.value, 10) || 1)}
                                inputProps={{ min: 1, max: 20 }}
                                fullWidth
                            />
                            <Button type="submit" variant="contained" disabled={isLoading} sx={{ mt: 2, py: 1.5 }}>
                                {isLoading ? <CircularProgress size={24} /> : 'Buat Soal'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h2">Hasil Soal</Typography>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveSoal} disabled={isLoading || generatedSoal.length === 0}>
                                Simpan ke Bank Soal
                            </Button>
                        </Box>
                        <Divider sx={{ mb: 2 }} />
                        
                        {isLoading && generatedSoal.length === 0 && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                        )}
                        
                        {!isLoading && generatedSoal.length === 0 && (
                            <Typography sx={{ textAlign: 'center', p: 5, color: 'text.secondary' }}>Soal yang dihasilkan akan muncul di sini.</Typography>
                        )}

                        {generatedSoal.length > 0 && (
                            <List>
                                {/* --- PERBAIKAN: Langsung map dari generatedSoal --- */}
                                {generatedSoal.map((soal, index) => (
                                    <ListItem key={index} alignItems="flex-start" sx={{ display: 'block', mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                    {index + 1}. <ReactMarkdown components={{ p: 'span' }}>{soal.pertanyaan}</ReactMarkdown>
                                                </Typography>
                                            }
                                            secondary={
                                                <>
                                                    {soal.pilihan && Object.entries(soal.pilihan).map(([key, value]) => (
                                                        <Typography key={key} variant="body2" color="text.secondary">{key}. {value}</Typography>
                                                    ))}
                                                    <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
                                                        Jawaban: {soal.jawaban_benar || soal.jawaban_ideal}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                        
                                        {soal.saran_gambar && soal.saran_gambar.length > 0 && (
                                            <Box sx={{ mt: 2 }}>
                                                <Typography variant="caption" color="text.secondary">Saran Ilustrasi (klik untuk memilih):</Typography>
                                                <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', p: 1 }}>
                                                    {soal.saran_gambar.map((imgUrl, imgIndex) => (
                                                        <Card key={imgIndex} sx={{ minWidth: 120, position: 'relative' }}>
                                                            <CardActionArea onClick={() => handleImageSelect(index, imgUrl)}>
                                                                <CardMedia component="img" height="100" image={imgUrl} alt={`Saran gambar ${imgIndex + 1}`} />
                                                                {soal.gambar_terpilih === imgUrl && (
                                                                    <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', bgcolor: 'rgba(0, 200, 83, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <CheckCircleIcon sx={{ color: 'white', fontSize: 40 }} />
                                                                    </Box>
                                                                )}
                                                            </CardActionArea>
                                                        </Card>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default QuizGeneratorPage;