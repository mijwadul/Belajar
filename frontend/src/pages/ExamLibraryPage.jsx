// frontend/src/pages/ExamLibraryPage.jsx

import React, { useEffect, useState } from 'react';
import { getAllExams, deleteExam, downloadExamPdf, getExamById } from '../api/aiService';
import { Link, useNavigate } from 'react-router-dom';
import {
    Container, Box, Typography,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, CircularProgress, Snackbar, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, Divider, IconButton, useTheme
} from '@mui/material';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ClearIcon from '@mui/icons-material/Clear';
import ShuffleIcon from '@mui/icons-material/Shuffle';

const ExamLibraryPage = () => {
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [selectedExamDetail, setSelectedExamDetail] = useState(null);
    const [loadingExamDetail, setLoadingExamDetail] = useState(false);
    const [isGeneratingVersion, setIsGeneratingVersion] = useState(false);

    const navigate = useNavigate();
    const theme = useTheme();

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

    const fetchExams = async () => {
        setLoading(true);
        try {
            const data = await getAllExams();
            setExams(data);
            setError(null);
        } catch (err) {
            let displayMessage = err.message || "Terjadi kesalahan yang tidak diketahui.";
            setError(displayMessage);
            
            if (err.message && (err.message.includes("Akses tidak diizinkan") || err.message.includes("Unauthorized") || err.message.includes("Forbidden"))) {
                 displayMessage = "Sesi Anda mungkin telah berakhir atau Anda tidak memiliki izin. Silakan login kembali.";
            } else if (err.message && err.message.includes("NetworkError")) {
                displayMessage = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau coba lagi nanti.";
            }

            showSnackbar(`Gagal memuat daftar ujian: ${displayMessage}`, 'error');
            console.error("Failed to fetch exams:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleDeleteExam = async (id, title) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus ujian "${title}"?`)) {
            try {
                await deleteExam(id);
                setExams(exams.filter(exam => exam.id !== id));
                showSnackbar('Ujian berhasil dihapus!', 'success');
            } catch (err) {
                showSnackbar(`Gagal menghapus ujian: ${err.message || 'Terjadi kesalahan.'}`, 'error');
                console.error("Failed to delete exam:", err);
            }
        }
    };

    const handleDownloadExam = async (examTitle, questionsData, layoutSettings) => {
        try {
            await downloadExamPdf(examTitle, questionsData, layoutSettings);
            showSnackbar('Ujian PDF berhasil diunduh!', 'success');
        } catch (err) {
            showSnackbar(`${err.message || 'Gagal mengunduh PDF ujian.'}`, 'error');
            console.error("Failed to download exam PDF:", err);
        }
    };

    const handleViewExamDetails = async (examId) => {
        setLoadingExamDetail(true);
        try {
            const detail = await getExamById(examId);
            setSelectedExamDetail(detail);
            setOpenDetailDialog(true);
        } catch (err) {
            showSnackbar(`Gagal memuat detail ujian: ${err.message || 'Terjadi kesalahan.'}`, 'error');
            console.error("Failed to fetch exam details:", err);
        } finally {
            setLoadingExamDetail(false);
        }
    };

    const handleCloseDetailDialog = () => {
        setOpenDetailDialog(false);
        setSelectedExamDetail(null);
    };

    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]]; 
        }
        return newArray;
    };

    const handleCreateNewVersion = async (examId, originalTitle) => {
        setIsGeneratingVersion(true);
        try {
            const originalExam = await getExamById(examId);
            const questions = originalExam.konten_json;
            const originalLayout = originalExam.layout || {};

            const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const newExamTitle = `${originalTitle} (Versi Acak - ${timestamp})`;

            const newLayoutSettings = {
                ...originalLayout,
                shuffle_questions: true,
                shuffle_answers: true,
            };

            await downloadExamPdf(newExamTitle, questions, newLayoutSettings);
            showSnackbar(`Versi baru ujian "${newExamTitle}" berhasil dibuat dan diunduh!`, 'success');

        } catch (err) {
            showSnackbar(`${err.message || 'Gagal membuat versi baru ujian.'}`, 'error');
            console.error("Failed to create new exam version:", err);
        } finally {
            setIsGeneratingVersion(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LibraryBooksIcon sx={{ mr: 1 }} /> Bank Ujian Tersimpan
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                Daftar semua ujian yang telah Anda buat dan simpan.
            </Typography>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Memuat daftar ujian...</Typography>
                </Box>
            ) : exams.length === 0 ? (
                <Paper elevation={2} sx={{ p: 3, borderRadius: '12px', textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                        {error ? `Terjadi kesalahan: ${error}` : 'Belum ada ujian yang tersimpan.'}
                    </Typography>
                    {!error && (
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                            Mulai buat ujian baru dari{' '}
                            <Link to="/exam-generator" style={{ textDecoration: 'none' }}>
                                <Button variant="text" color="primary">
                                    Halaman Pembuat Ujian
                                </Button>
                            </Link>
                            .
                        </Typography>
                    )}
                </Paper>
            ) : (
                <TableContainer component={Paper} elevation={3} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                    <Table stickyHeader aria-label="bank ujian table">
                        <TableHead>
                            <TableRow sx={{ bgcolor: theme.palette.primary.main }}>
                                {/* MENGUBAH WARNA TEKS HEADER MENJADI HITAM (#000000) */}
                                <TableCell sx={{ fontWeight: 'bold', color: '#000000' }}>Judul Ujian</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#000000' }}>Jumlah Soal</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: '#000000' }}>Tanggal Dibuat</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', color: '#000000' }}>Aksi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {exams.map((exam) => (
                                <TableRow key={exam.id} hover>
                                    <TableCell>
                                        <Button
                                            variant="text"
                                            onClick={() => handleViewExamDetails(exam.id)}
                                            sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0 }}
                                        >
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                {exam.judul}
                                            </Typography>
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {(exam.konten_json && exam.konten_json.length) || 0}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {new Date(exam.tanggal_dibuat).toLocaleDateString('id-ID')}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            aria-label="view"
                                            onClick={() => handleViewExamDetails(exam.id)}
                                            color="info"
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                        <IconButton
                                            aria-label="create new version"
                                            onClick={() => handleCreateNewVersion(exam.id, exam.judul)}
                                            disabled={isGeneratingVersion}
                                            color="primary"
                                        >
                                            {isGeneratingVersion ? <CircularProgress size={20} /> : <ShuffleIcon />}
                                        </IconButton>
                                        <IconButton
                                            aria-label="download"
                                            onClick={() => handleDownloadExam(exam.judul, exam.konten_json, exam.layout || {})}
                                            color="success"
                                        >
                                            <DownloadIcon />
                                        </IconButton>
                                        <IconButton
                                            aria-label="delete"
                                            onClick={() => handleDeleteExam(exam.id, exam.judul)}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDetailDialog} onClose={handleCloseDetailDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    Detail Ujian: {selectedExamDetail?.judul}
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseDetailDialog}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                        }}
                    >
                        <ClearIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {loadingExamDetail ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
                            <CircularProgress />
                            <Typography sx={{ ml: 2 }}>Memuat detail soal...</Typography>
                        </Box>
                    ) : selectedExamDetail ? (
                        <Box>
                            <Typography variant="h6" gutterBottom>Soal-soal Ujian:</Typography>
                            <List>
                                {selectedExamDetail.konten_json.length > 0 ? (
                                    selectedExamDetail.konten_json.map((q, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem alignItems="flex-start">
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="body1" component="span" sx={{ fontWeight: 'medium' }}>
                                                            {index + 1}. {q.pertanyaan}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                                            {q.pilihan ? (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    {Object.entries(q.pilihan).map(([key, value]) => `${key}. ${value}`).join(' | ')}
                                                                    <br/>
                                                                    **Kunci Jawaban:** {q.jawaban_benar}
                                                                </Typography>
                                                            ) : q.jawaban_ideal ? (
                                                                <Typography variant="body2" color="text.secondary">
                                                                    **Jawaban Ideal:** {q.jawaban_ideal}
                                                                </Typography>
                                                            ) : null}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < selectedExamDetail.konten_json.length - 1 && <Divider component="li" variant="inset" />}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Tidak ada soal dalam ujian ini.
                                    </Typography>
                                )}
                            </List>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="h6" gutterBottom>Pengaturan Layout:</Typography>
                            <Typography variant="body2">
                                Acak Soal: {selectedExamDetail.layout?.shuffle_questions ? 'Ya' : 'Tidak'}
                            </Typography>
                            <Typography variant="body2">
                                Acak Pilihan Jawaban: {selectedExamDetail.layout?.shuffle_answers ? 'Ya' : 'Tidak'}
                            </Typography>
                            {selectedExamDetail.layout?.student_info_fields && selectedExamDetail.layout.student_info_fields.length > 0 && (
                                <Typography variant="body2">
                                    Info Siswa: {selectedExamDetail.layout.student_info_fields.join(', ')}
                                </Typography>
                            )}
                        </Box>
                    ) : (
                        <Typography variant="body1" color="text.secondary">
                            Tidak ada detail ujian yang dipilih.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDetailDialog} color="primary" variant="contained">
                        Tutup
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
};

export default ExamLibraryPage;