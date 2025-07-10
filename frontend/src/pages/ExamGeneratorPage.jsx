// frontend/src/pages/ExamGeneratorPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSoal, getSoalById, downloadExamPdf, saveExam } from '../api/aiService'; 
import {
    Container, Box, Typography, Grid, Paper,
    TextField, InputAdornment, IconButton, Button,
    CircularProgress, Snackbar, Alert,
    List, ListItem, ListItemText, Checkbox, FormControlLabel,
    Collapse, Divider, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'; 
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PostAddIcon from '@mui/icons-material/PostAdd'; 
import DownloadIcon from '@mui/icons-material/Download'; 
import SaveIcon from '@mui/icons-material/Save';

function ExamGeneratorPage() {
    const navigate = useNavigate();
    const [soalSets, setSoalSets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSoalSetId, setExpandedSoalSetId] = useState(null);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [examPreview, setExamPreview] = useState('');
    const [examTitle, setExamTitle] = useState('Ujian Baru');

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [isDownloading, setIsDownloading] = useState(false); 
    const [isSaving, setIsSaving] = useState(false);

    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [shuffleAnswers, setShuffleAnswers] = useState(false);
    // NEW: State untuk pilihan informasi siswa
    const [studentInfoFields, setStudentInfoFields] = useState({
        namaSiswa: true,
        nomorInduk: true,
        nomorAbsen: true,
    });
    const [examCategories, setExamCategories] = useState([]); 

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
                    setIsLoading(true); 
                    const detailedData = await getSoalById(soalSetId);
                    setSoalSets(prevSets => prevSets.map(s => 
                        s.id === soalSetId ? { ...s, detailedQuestions: detailedData.konten_json.soal } : s
                    ));
                    setExpandedSoalSetId(soalSetId);
                } catch (error) {
                    console.error("Gagal memuat detail soal:", error);
                    showSnackbar('Gagal memuat detail soal untuk set ini.', 'error');
                } finally {
                    setIsLoading(false); 
                }
            } else {
                setExpandedSoalSetId(soalSetId);
            }
        }
    };

    const handleQuestionSelect = (question, soalSetId) => {
        setSelectedQuestions(prevSelected => {
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

    // Helper function to shuffle an array
    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; 
        }
        return newArray;
    };

    // NEW: Handler untuk perubahan checkbox info siswa
    const handleStudentInfoFieldChange = (event) => {
        setStudentInfoFields({
            ...studentInfoFields,
            [event.target.name]: event.target.checked,
        });
    };

    const handleGenerateExam = () => {
        if (selectedQuestions.length === 0) {
            showSnackbar('Pilih setidaknya satu soal untuk membuat pratinjau ujian.', 'warning');
            setExamPreview('');
            return;
        }

        let questionsForPreview = [...selectedQuestions];

        if (shuffleQuestions) {
            questionsForPreview = shuffleArray(questionsForPreview);
        }

        // NEW: Tambahkan info siswa ke pratinjau
        let infoFieldsPreview = '';
        if (studentInfoFields.namaSiswa) infoFieldsPreview += 'Nama Siswa: ______________\n';
        if (studentInfoFields.nomorInduk) infoFieldsPreview += 'Nomor Induk: _____________\n';
        if (studentInfoFields.nomorAbsen) infoFieldsPreview += 'Nomor Absen: _____________\n';
        if (infoFieldsPreview) infoFieldsPreview += '\n';

        let previewContent = `=== ${examTitle.toUpperCase()} ===\n\n${infoFieldsPreview}`; // Gabungkan info siswa
        questionsForPreview.forEach((item, index) => {
            const q = item.question;
            previewContent += `${index + 1}. ${q.pertanyaan}\n`;
            
            if (q.pilihan) {
                let options = Object.entries(q.pilihan);
                if (shuffleAnswers) {
                    options = shuffleArray(options);
                }
                options.forEach(([key, value]) => {
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
            // NEW: Buat array berisi label field siswa yang dipilih
            const selectedStudentInfoLabels = [];
            if (studentInfoFields.namaSiswa) selectedStudentInfoLabels.push('Nama Siswa');
            if (studentInfoFields.nomorInduk) selectedStudentInfoLabels.push('Nomor Induk/NISN'); // Sesuaikan label
            if (studentInfoFields.nomorAbsen) selectedStudentInfoLabels.push('Nomor Absen');

            const layoutSettings = {
                shuffle_questions: shuffleQuestions,
                shuffle_answers: shuffleAnswers,
                student_info_fields: selectedStudentInfoLabels, // Kirim ini ke backend
                categories: examCategories 
            };

            const questionsForPdf = selectedQuestions.map(item => ({
                pertanyaan: item.question.pertanyaan,
                pilihan: item.question.pilihan,
                jawaban_benar: item.question.jawaban_benar,
                jawaban_ideal: item.question.jawaban_ideal,
                tipe_soal: item.question.pilihan ? 'Pilihan Ganda' : 'Esai'
            }));

            await downloadExamPdf(examTitle, questionsForPdf, layoutSettings);
            showSnackbar('Ujian berhasil diunduh!', 'success');
        } catch (error) {
            console.error("Gagal mengunduh ujian:", error);
            showSnackbar(error.message || 'Gagal mengunduh ujian. Silakan coba lagi.', 'error');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSaveExam = async () => {
        if (selectedQuestions.length === 0) {
            showSnackbar('Pilih setidaknya satu soal untuk menyimpan ujian.', 'warning');
            return;
        }
        if (!examTitle.trim()) {
            showSnackbar('Judul ujian tidak boleh kosong untuk disimpan.', 'warning');
            return;
        }

        setIsSaving(true);
        try {
            // NEW: Buat array berisi label field siswa yang dipilih
            const selectedStudentInfoLabels = [];
            if (studentInfoFields.namaSiswa) selectedStudentInfoLabels.push('Nama Siswa');
            if (studentInfoFields.nomorInduk) selectedStudentInfoLabels.push('Nomor Induk/NISN'); // Sesuaikan label
            if (studentInfoFields.nomorAbsen) selectedStudentInfoLabels.push('Nomor Absen');

            const examData = {
                exam_title: examTitle,
                questions: selectedQuestions.map(item => ({
                    pertanyaan: item.question.pertanyaan,
                    pilihan: item.question.pilihan,
                    jawaban_benar: item.question.jawaban_benar,
                    jawaban_ideal: item.question.jawaban_ideal,
                    tipe_soal: item.question.pilihan ? 'Pilihan Ganda' : 'Esai'
                })),
                layout: {
                    shuffle_questions: shuffleQuestions,
                    shuffle_answers: shuffleAnswers,
                    student_info_fields: selectedStudentInfoLabels, // Kirim ini ke backend
                    categories: examCategories 
                }
            };
            
            const response = await saveExam(examData);
            showSnackbar('Ujian berhasil disimpan!', 'success');
            console.log("Ujian berhasil disimpan:", response);
            // Opsional: navigasi ke halaman Bank Ujian Tersimpan setelah berhasil menyimpan
            // navigate('/bank-ujian'); 
        } catch (error) {
            console.error("Gagal menyimpan ujian:", error);
            showSnackbar(error.message || 'Gagal menyimpan ujian. Silakan coba lagi.', 'error');
        } finally {
            setIsSaving(false);
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

                {/* Kolom Kanan: Pratinjau Ujian & Tombol Generate/Download/Save */}
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

                        {/* Opsi Layout */}
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>Pengaturan Layout:</Typography>
                            <FormControlLabel
                                control={<Checkbox checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />}
                                label="Acak Urutan Soal"
                                sx={{ mb: 0.5 }}
                            />
                            <FormControlLabel
                                control={<Checkbox checked={shuffleAnswers} onChange={(e) => setShuffleAnswers(e.target.checked)} />}
                                label="Acak Pilihan Jawaban (Pilihan Ganda)"
                                sx={{ mb: 0.5 }}
                            />
                            <Divider sx={{ my: 1 }} />
                            {/* NEW: Opsi Informasi Siswa */}
                            <Typography variant="subtitle1" sx={{ mt: 1 }}>Informasi Siswa pada Ujian:</Typography>
                            <FormControlLabel
                                control={<Checkbox checked={studentInfoFields.namaSiswa} onChange={handleStudentInfoFieldChange} name="namaSiswa" />}
                                label="Nama Siswa"
                                sx={{ mb: 0.5 }}
                            />
                            <FormControlLabel
                                control={<Checkbox checked={studentInfoFields.nomorInduk} onChange={handleStudentInfoFieldChange} name="nomorInduk" />}
                                label="Nomor Induk/NISN"
                                sx={{ mb: 0.5 }}
                            />
                            <FormControlLabel
                                control={<Checkbox checked={studentInfoFields.nomorAbsen} onChange={handleStudentInfoFieldChange} name="nomorAbsen" />}
                                label="Nomor Absen"
                                sx={{ mb: 0.5 }}
                            />
                        </Box>
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
                            color="primary"
                            fullWidth
                            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                            onClick={handleSaveExam}
                            disabled={selectedQuestions.length === 0 || !examTitle.trim() || isSaving}
                            sx={{ py: 1.5, borderRadius: '8px', mt: 3 }}
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan Ujian'}
                        </Button>
                        
                        <Button
                            variant="contained"
                            color="success"
                            fullWidth
                            startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                            onClick={handleDownloadExamPdf}
                            disabled={selectedQuestions.length === 0 || !examTitle.trim() || isDownloading}
                            sx={{ py: 1.5, borderRadius: '8px', mt: 2 }}
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