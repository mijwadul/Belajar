// frontend/src/pages/SoalDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { getSoalById } from '../api/aiService'; // Pastikan getSoalById diimpor
import {
    Container, Box, Typography, Paper, CircularProgress,
    Button, List, ListItem, ListItemText, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description'; // Ikon untuk RPP terkait
import QuizIcon from '@mui/icons-material/Quiz'; // Ikon untuk Soal

function SoalDetailPage() {
    const { id } = useParams();
    const [soalSet, setSoalSet] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSoal = async () => {
            try {
                const data = await getSoalById(id);
                setSoalSet(data);
            } catch (err) {
                console.error("Gagal memuat detail soal:", err);
                setError(err.message || 'Gagal memuat detail soal.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSoal();
    }, [id]);

    if (isLoading) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>Memuat detail soal...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="error">{error}</Typography>
                <Button variant="contained" component={RouterLink} to="/bank-soal" sx={{ mt: 2 }}>
                    Kembali ke Bank Soal
                </Button>
            </Container>
        );
    }

    if (!soalSet) {
        return (
            <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6">Soal tidak ditemukan.</Typography>
                <Button variant="contained" component={RouterLink} to="/bank-soal" sx={{ mt: 2 }}>
                    Kembali ke Bank Soal
                </Button>
            </Container>
        );
    }

    // Perbaikan di sini: Akses soalSet.konten_json.soal
    const questions = soalSet.konten_json?.soal || []; 

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                component={RouterLink}
                to="/bank-soal"
                sx={{ mb: 3 }}
            >
                Kembali ke Bank Soal
            </Button>

            <Paper elevation={3} sx={{ p: 4, borderRadius: '12px' }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <QuizIcon sx={{ mr: 1 }} /> {soalSet.judul}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 2 }}>
                    Dibuat dari RPP: {' '}
                    <RouterLink to={`/rpp/${soalSet.rpp_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography component="span" variant="subtitle1" sx={{ display: 'inline-flex', alignItems: 'center', fontWeight: 'bold' }}>
                            <DescriptionIcon sx={{ mr: 0.5, fontSize: 'medium' }} /> {soalSet.judul_rpp}
                        </Typography>
                    </RouterLink>
                </Typography>
                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" component="h2" gutterBottom>
                    Daftar Soal ({questions.length} item)
                </Typography>

                {questions.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                        Tidak ada soal dalam set ini.
                    </Typography>
                ) : (
                    <List>
                        {questions.map((soal, index) => (
                            <ListItem
                                key={index}
                                alignItems="flex-start"
                                sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                            {index + 1}. {soal.pertanyaan}
                                        </Typography>
                                    }
                                    secondary={
                                        <>
                                            {soal.pilihan && Object.keys(soal.pilihan).length > 0 && (
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
                )}

                {/* Tombol untuk mengunduh, dll. bisa ditambahkan di sini */}
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                    <Button variant="contained" color="primary" disabled>
                        Unduh Soal (PDF)
                    </Button>
                    <Button variant="outlined" color="secondary" disabled>
                        Cetak
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default SoalDetailPage;