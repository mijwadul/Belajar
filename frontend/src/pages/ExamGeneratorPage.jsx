// frontend/src/pages/ExamGeneratorPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSoal, getSoalById, downloadExamPdf } from '../api/aiService'; // Import downloadExamPdf
import {
    Container, Box, Typography, Grid, Paper,
    TextField, InputAdornment, IconButton, Button,
    CircularProgress, Snackbar, Alert,
    List, ListItem, ListItemText, Checkbox, FormControlLabel,
    Collapse, Divider, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'; // Untuk ikon judul halaman
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PostAddIcon from '@mui/icons-material/PostAdd'; // Ikon untuk Buat Ujian
import DownloadIcon from '@mui/icons-material/Download'; // Ikon untuk Unduh

function ExamGeneratorPage() {
    const navigate = useNavigate();
    const [soalSets, setSoalSets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSoalSetId, setExpandedSoalSetId] = useState(null); // ID set soal yang sedang diperluas
    const [selectedQuestions, setSelectedQuestions] = useState([]); // Array objek soal yang dipilih untuk ujian
    const [examPreview, setExamPreview] = useState('');
    const [examTitle, setExamTitle] = useState('Ujian Baru'); // Untuk judul ujian di PDF

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [isDownloading, setIsDownloading] = useState(false); // State untuk loading download

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

    const muatDataSoal = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllSoal();
            setSoalSets(data);
        } catch (error) {
            console.error("Gagal memuat daftar set soal:", error);
            showSnackbar('Gagal memuat daftar set soal.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        muatDataSoal();
    }, [muatDataSoal]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleToggleExpand = async (soalSetId) => {
        if (expandedSoalSetId === soalSetId) {
            setExpandedSoalSetId(null);
        } else {
            const targetSoalSet = soalSets.find(s => s.id === soalSetId);
            if (targetSoalSet && !targetSoalSet.detailedQuestions) {
                try {
                    setIsLoading(true); // Set loading while fetching detail
                    const detailedData = await getSoalById(soalSetId);
                    setSoalSets(prevSets => prevSets.map(s => 
                        s.id === soalSetId ? { ...s, detailedQuestions: detailedData.konten_json.soal } : s
                    ));
                    setExpandedSoalSetId(soalSetId);
                } catch (error) {
                    console.error("Gagal memuat detail soal:", error);
                    showSnackbar('Gagal memuat detail soal untuk set ini.', 'error');
                } finally {
                    setIsLoading(false); // End loading
                }
            } else {
                setExpandedSoalSetId(soalSetId);
            }
        }
    };

    const handleQuestionSelect = (question, soalSetId) => {
        setSelectedQuestions(prevSelected => {
            // Gunakan ID unik untuk setiap soal jika tersedia, jika tidak kombinasi soalSetId dan pertanyaan
            // Asumsi setiap pertanyaan dalam satu soalSet unik
            const questionIdentifier = `${soalSetId}-${question.pertanyaan}`; 
            
            const isSelected = prevSelected.some(q => 
                `${q.soalSetId}-${q.question.pertanyaan}` === questionIdentifier
            );

            if (isSelected) {
                return prevSelected.filter(q => 
                    `${q.soalSetId}-${q.question.pertanyaan}` !== questionIdentifier
                );
            } else {
                return [...prevSelected, { soalSetId, question }];
            }
        });
    };

    const handleGenerateExam = () => {
        if (selectedQuestions.length === 0) {
            showSnackbar('Pilih setidaknya satu soal untuk membuat pratinjau ujian.', 'warning');
            setExamPreview('');
            return;
        }

        let previewContent = `=== ${examTitle.toUpperCase()} ===\n\n`;
        selectedQuestions.forEach((item, index) => {
            const q = item.question;
            previewContent += `${index + 1}. ${q.pertanyaan}\n`;
            if (q.pilihan) {
                Object.entries(q.pilihan).forEach(([key, value]) => {
                    previewContent += `   ${key}. ${value}\n`;
                });
                previewContent += `   Kunci Jawaban: ${q.jawaban_benar}\n`;
            } else if (q.jawaban_ideal) {
                previewContent += `   Jawaban Ideal: ${q.jawaban_ideal}\n`;
            }
            previewContent += `\n`;
        });
        setExamPreview(previewContent);
        showSnackbar('Pratinjau ujian berhasil dibuat!', 'success');
    };

    const handleDownloadExamPdf = async () => {
        if (selectedQuestions.length === 0) {
            showSnackbar('Pilih setidaknya satu soal untuk mengunduh ujian.', 'warning');
            return;
        }
        if (!examTitle.trim()) {
            showSnackbar('Judul ujian tidak boleh kosong untuk diunduh.', 'warning');
            return;
        }

        setIsDownloading(true);
        try {
            const questionIds = selectedQuestions.map(item => ({
                id: item.question.id, // Pastikan soal individual memiliki ID jika disimpan terpisah
                // Jika tidak ada ID unik per soal, kita perlu mengirim struktur soal lengkap
                // Atau modifikasi backend untuk menerima array objek soal penuh.
                // Untuk contoh ini, saya akan mengirimkan struktur lengkap per soal,
                // karena ID unik soal individual mungkin belum ada di database Anda.
                pertanyaan: item.question.pertanyaan,
                pilihan: item.question.pilihan,
                jawaban_benar: item.question.jawaban_benar,
                jawaban_ideal: item.question.jawaban_ideal
            }));

            // Panggil fungsi downloadExamPdf dari aiService.js
            await downloadExamPdf(examTitle, questionIds);
            showSnackbar('Ujian berhasil diunduh!', 'success');
        } catch (error) {
            console.error("Gagal mengunduh ujian:", error);
            showSnackbar(error.message || 'Gagal mengunduh ujian. Silakan coba lagi.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const filteredSoalSets = soalSets.filter(set =>
        set.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        set.judul_rpp.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PostAddIcon sx={{ mr: 1 }} /> Buat Ujian Baru
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                Pilih soal-soal dari bank soal Anda untuk membuat format ujian.
            </Typography>

            <Grid container spacing={3}>
                {/* Kolom Kiri: Daftar Set Soal & Pemilihan */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', minHeight: '400px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                            <Typography variant="h5" component="h2">
                                Pilih Soal
                            </Typography>
                            <TextField
                                label="Cari Set Soal"
                                variant="outlined"
                                size="small"
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
                                sx={{ maxWidth: '300px', flexGrow: 1 }}
                            />
                        </Box>

                        {isLoading && filteredSoalSets.length === 0 ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
                                <CircularProgress />
                                <Typography sx={{ ml: 2 }}>Memuat set soal...</Typography>
                            </Box>
                        ) : filteredSoalSets.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 3, py: 4 }}>
                                {searchQuery ? 
                                    "Tidak ada set soal yang cocok dengan pencarian Anda." : 
                                    "Bank Soal kosong. Silakan buat soal baru di 'Generator Soal'."
                                }
                            </Typography>
                        ) : (
                            <List>
                                {filteredSoalSets.map((soalSet) => (
                                    <Paper key={soalSet.id} elevation={1} sx={{ mb: 2, borderRadius: '8px', overflow: 'hidden' }}>
                                        <ListItem
                                            onClick={() => handleToggleExpand(soalSet.id)}
                                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                        >
                                            <ListItemText
                                                primary={<Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{soalSet.judul}</Typography>}
                                                secondary={`Dari RPP: ${soalSet.judul_rpp} (${new Date(soalSet.tanggal_dibuat).toLocaleDateString('id-ID')})`}
                                            />
                                            <IconButton edge="end">
                                                {expandedSoalSetId === soalSet.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                            </IconButton>
                                        </ListItem>
                                        <Collapse in={expandedSoalSetId === soalSet.id} timeout="auto" unmountOnExit>
                                            <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
                                                {isLoading && soalSet.detailedQuestions === undefined ? (
                                                     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
                                                        <CircularProgress size={20} />
                                                        <Typography variant="body2" sx={{ ml: 1 }}>Memuat soal...</Typography>
                                                    </Box>
                                                ) : soalSet.detailedQuestions && soalSet.detailedQuestions.length > 0 ? (
                                                    <List dense>
                                                        {soalSet.detailedQuestions.map((q, qIndex) => (
                                                            <ListItem key={`${soalSet.id}-${qIndex}`} disablePadding>
                                                                <FormControlLabel
                                                                    control={
                                                                        <Checkbox
                                                                            checked={selectedQuestions.some(item => 
                                                                                `${item.soalSetId}-${item.question.pertanyaan}` === `${soalSet.id}-${q.pertanyaan}`
                                                                            )}
                                                                            onChange={() => handleQuestionSelect(q, soalSet.id)}
                                                                        />
                                                                    }
                                                                    label={
                                                                        <Typography variant="body2">
                                                                            {qIndex + 1}. {q.pertanyaan}
                                                                        </Typography>
                                                                    }
                                                                    sx={{ width: '100%', m: 0 }}
                                                                />
                                                            </ListItem>
                                                        ))}
                                                    </List>
                                                ) : (
                                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                                                        Tidak ada soal dalam set ini.
                                                    </Typography>
                                                )}
                                            </Box>
                                        </Collapse>
                                    </Paper>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Grid>

                {/* Kolom Kanan: Pratinjau Ujian & Tombol Generate/Download */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                            Detail Ujian
                        </Typography>
                        <TextField
                            fullWidth
                            label="Judul Ujian"
                            variant="outlined"
                            value={examTitle}
                            onChange={(e) => setExamTitle(e.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ flexGrow: 1, maxHeight: '40vh', overflowY: 'auto', p: 1, border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9', mb: 3 }}>
                            {selectedQuestions.length === 0 ? (
                                <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 5 }}>
                                    Pilih soal dari daftar di samping untuk melihat pratinjau ujian Anda di sini.
                                </Typography>
                            ) : (
                                <List dense>
                                    {selectedQuestions.map((item, index) => (
                                        <ListItem key={`${item.soalSetId}-${item.question.pertanyaan}-${index}`} sx={{ borderBottom: '1px dashed #eee' }}>
                                            <ListItemText
                                                primary={<Typography variant="body1" sx={{ fontWeight: 'medium' }}>{index + 1}. {item.question.pertanyaan}</Typography>}
                                                secondary={item.question.pilihan ? `Pilihan: ${Object.keys(item.question.pilihan).map(k => `${k}. ${item.question.pilihan[k]}`).join(', ')}` : ''}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            )}
                        </Box>
                        <Button
                            variant="contained"
                            fullWidth
                            startIcon={<PostAddIcon />}
                            onClick={handleGenerateExam}
                            disabled={selectedQuestions.length === 0}
                            sx={{ py: 1.5, borderRadius: '8px', mb: 2 }}
                        >
                            Buat Pratinjau Ujian
                        </Button>

                        {examPreview && (
                            <Box sx={{ mt: 1, p: 2, border: '1px solid #ccc', borderRadius: '8px', bgcolor: '#fff', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                                <Typography variant="h6">Pratinjau Ujian (Teks)</Typography>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="body2" component="pre" sx={{ fontSize: '0.85rem' }}>
                                    {examPreview}
                                </Typography>
                            </Box>
                        )}
                        
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                            onClick={handleDownloadExamPdf}
                            disabled={selectedQuestions.length === 0 || !examTitle.trim() || isDownloading}
                            sx={{ py: 1.5, borderRadius: '8px', mt: 3 }}
                        >
                            {isDownloading ? 'Mengunduh...' : 'Unduh Ujian (PDF)'}
                        </Button>
                    </Paper>
                </Grid>
            </Grid>

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default ExamGeneratorPage;