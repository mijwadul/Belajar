// frontend/src/pages/BankSoalPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { getAllSoal, deleteSoal } from '../api/aiService'; // Import deleteSoal
import {
    Container, Grid, Paper, Typography, Button, Box,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Snackbar, Alert, IconButton, TextField, InputAdornment,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'; // Untuk ikon judul
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

function BankSoalPage() {
    const [soalList, setSoalList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [soalToDelete, setSoalToDelete] = useState(null);

    const navigate = useNavigate();

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

    const muatData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAllSoal();
            setSoalList(data);
        } catch (error) {
            console.error("Gagal memuat bank soal:", error);
            showSnackbar('Gagal memuat bank soal.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        muatData();
    }, [muatData]);

    const handleSearchChange = (event) => {
        setSearchQuery(event.target.value);
    };

    const handleOpenDeleteDialog = (soal) => {
        setSoalToDelete(soal);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setSoalToDelete(null);
    };

    const handleDeleteConfirm = async () => {
        if (!soalToDelete) return;

        setIsLoading(true);
        try {
            await deleteSoal(soalToDelete.id);
            showSnackbar(`Set soal "${soalToDelete.judul}" berhasil dihapus.`, 'success');
            handleCloseDeleteDialog();
            muatData(); // Refresh list
        } catch (error) {
            console.error("Gagal menghapus set soal:", error);
            showSnackbar(error.message || 'Gagal menghapus set soal.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredSoalList = soalList.filter(soal =>
        soal.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        soal.judul_rpp.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <QuestionAnswerIcon sx={{ mr: 1 }} /> Bank Soal
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
                Berikut adalah daftar semua set soal yang pernah Anda simpan.
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: '12px' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Cari Judul Soal / RPP"
                                variant="outlined"
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
                                sx={{ maxWidth: '400px', flexGrow: 1 }}
                            />
                            <Button
                                variant="contained"
                                startIcon={<AddIcon />}
                                onClick={() => navigate('/generator-soal')}
                                disabled={isLoading}
                                sx={{ minWidth: '180px' }}
                            >
                                Buat Soal Baru
                            </Button>
                        </Box>

                        {isLoading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                <CircularProgress />
                                <Typography sx={{ ml: 2 }}>Memuat bank soal...</Typography>
                            </Box>
                        ) : filteredSoalList.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 3, py: 4 }}>
                                {searchQuery ? 
                                    "Tidak ada soal yang cocok dengan pencarian Anda." : 
                                    "Bank Soal masih kosong. Silakan buat soal baru dari halaman 'Generator Soal'."
                                }
                            </Typography>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Judul Set Soal</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Dibuat dari RPP</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Tanggal Dibuat</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Aksi</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredSoalList.map((soal) => (
                                            <TableRow key={soal.id} hover>
                                                <TableCell>
                                                    <RouterLink to={`/soal/${soal.id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 'medium' }}>
                                                        {soal.judul}
                                                    </RouterLink>
                                                </TableCell>
                                                <TableCell>{soal.judul_rpp}</TableCell>
                                                <TableCell>{new Date(soal.tanggal_dibuat).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</TableCell>
                                                <TableCell>
                                                    <IconButton
                                                        aria-label="edit"
                                                        onClick={() => navigate(`/soal/${soal.id}`)} // Arahkan ke detail untuk edit
                                                        color="primary"
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        aria-label="delete"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenDeleteDialog(soal); }}
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
                    </Paper>
                </Grid>
            </Grid>

            {/* Dialog Konfirmasi Hapus */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Konfirmasi Penghapusan Soal"}</DialogTitle>
                <DialogContent>
                    <Typography id="alert-dialog-description">
                        Apakah Anda yakin ingin menghapus set soal "{soalToDelete?.judul}"? Tindakan ini tidak dapat dibatalkan.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="primary" disabled={isLoading}>
                        Batal
                    </Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Hapus'}
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

export default BankSoalPage;