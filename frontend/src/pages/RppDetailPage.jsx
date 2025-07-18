// frontend/src/pages/RppDetailPage.jsx

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    Button,
    IconButton,
    Chip,
    Stack,
    Divider,
    Snackbar
} from '@mui/material';
import { ArrowBack, Download, Edit } from '@mui/icons-material';
import { getRppById, downloadRppPdf } from '../api/aiService'; // Pastikan downloadRppPdf diimpor

const RppDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [rpp, setRpp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const fetchRpp = async () => {
            setLoading(true);
            try {
                const data = await getRppById(id);
                setRpp(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchRpp();
    }, [id]);

    const handleDownloadPdf = async () => {
        if (!rpp) return;
        try {
            await downloadRppPdf(rpp.id, rpp.judul);
            setSnackbar({ open: true, message: 'Unduhan PDF berhasil dimulai!', severity: 'success' });
        } catch (err) {
            setSnackbar({ open: true, message: `Gagal mengunduh PDF: ${err.message}`, severity: 'error' });
        }
    };

    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
    }

    if (!rpp) {
        return <Alert severity="info" sx={{ m: 3 }}>RPP tidak ditemukan.</Alert>;
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '900px', mx: 'auto' }}>
            {/* Header Halaman */}
            <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                <IconButton onClick={() => navigate('/perpustakaan-rpp')}>
                    <ArrowBack />
                </IconButton>
                <Typography variant="h4" component="h1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
                    Detail RPP
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Download />}
                    onClick={handleDownloadPdf}
                >
                    Download PDF
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<Edit />}
                    onClick={() => navigate(`/generator-rpp/${rpp.id}`)} // Arahkan ke generator untuk edit
                >
                    Edit
                </Button>
            </Stack>

            {/* Konten RPP dalam Paper */}
            <Paper elevation={3} sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: '600' }}>
                    {rpp.judul}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <Chip label={`Kelas: ${rpp.nama_kelas}`} color="primary" variant="outlined" />
                </Stack>
                
                <Divider sx={{ my: 2 }} />

                {/* Styling untuk konten Markdown */}
                <Box
                    className="markdown-content" // Anda bisa tambahkan styling khusus di CSS untuk class ini
                    sx={{
                        '& h1, & h2, & h3': {
                            mt: 3,
                            mb: 1,
                            fontWeight: 'bold',
                        },
                        '& p': {
                            lineHeight: 1.7,
                            mb: 2,
                        },
                        '& ul, & ol': {
                            pl: 3,
                            mb: 2,
                        },
                        '& li': {
                            mb: 1,
                        },
                        '& code': {
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            px: '4px',
                            py: '2px',
                            borderRadius: '4px',
                        },
                    }}
                >
                    <ReactMarkdown>{rpp.konten_markdown}</ReactMarkdown>
                </Box>
            </Paper>
            
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default RppDetailPage;