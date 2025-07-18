// frontend/src/pages/RppLibraryPage.jsx

import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Alert,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    TextField,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    MenuItem,
    FormControl,
    InputLabel,
    Select
} from '@mui/material';
import { Edit, Delete, Download, Visibility, Add, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAllRpps, deleteRpp, updateRpp, getRppById, downloadRppPdf } from '../api/aiService';
import { getAllKelas } from '../api/classroomService';

const RppLibraryPage = () => {
    const navigate = useNavigate();
    const [rpps, setRpps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [searchTerm, setSearchTerm] = useState('');
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [currentRpp, setCurrentRpp] = useState(null);
    const [editForm, setEditForm] = useState({ judul: '', kelas_id: '' });
    const [kelasList, setKelasList] = useState([]);

    useEffect(() => {
        fetchRppsAndKelas();
    }, []);

    const fetchRppsAndKelas = async () => {
        setLoading(true);
        setError(null);
        try {
            const [rppsData, kelasData] = await Promise.all([
                getAllRpps(),
                getAllKelas()
            ]);
            setRpps(rppsData);
            setKelasList(kelasData);
        } catch (err) {
            setError(err.message);
            setSnackbarMessage(`Error: ${err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const filteredRpps = rpps.filter(rpp =>
        rpp.judul.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rpp.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEditClick = async (rppId) => {
        try {
            const rppDetail = await getRppById(rppId);
            setCurrentRpp(rppDetail);
            setEditForm({ judul: rppDetail.judul, kelas_id: rppDetail.kelas_id });
            setOpenEditDialog(true);
        } catch (err) {
            setSnackbarMessage(`Gagal memuat detail RPP: ${err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleEditDialogClose = () => {
        setOpenEditDialog(false);
        setCurrentRpp(null);
        setEditForm({ judul: '', kelas_id: '' });
    };

    const handleEditFormChange = (event) => {
        setEditForm({ ...editForm, [event.target.name]: event.target.value });
    };

    const handleEditSubmit = async () => {
        if (!currentRpp) return;
        setLoading(true);
        try {
            const updatedData = {
                judul: editForm.judul,
                kelas_id: editForm.kelas_id,
                konten_markdown: currentRpp.konten_markdown
            };
            await updateRpp(currentRpp.id, updatedData);
            setSnackbarMessage('RPP berhasil diperbarui!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleEditDialogClose();
            fetchRppsAndKelas();
        } catch (err) {
            setSnackbarMessage(`Gagal memperbarui RPP: ${err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (rppId) => {
        setCurrentRpp(rpps.find(r => r.id === rppId));
        setOpenDeleteDialog(true);
    };

    const handleDeleteDialogClose = () => {
        setOpenDeleteDialog(false);
        setCurrentRpp(null);
    };

    const handleDeleteConfirm = async () => {
        if (!currentRpp) return;
        setLoading(true);
        try {
            await deleteRpp(currentRpp.id);
            setSnackbarMessage('RPP berhasil dihapus!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleDeleteDialogClose();
            fetchRppsAndKelas();
        } catch (err) {
            setSnackbarMessage(`Gagal menghapus RPP: ${err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (rppId, rppTitle) => {
        setLoading(true);
        try {
            await downloadRppPdf(rppId, rppTitle);
            setSnackbarMessage('RPP PDF berhasil diunduh!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
        } catch (err) {
            setSnackbarMessage(`Gagal mengunduh RPP PDF: ${err.message}`);
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Perpustakaan RPP
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                <TextField
                    label="Cari RPP"
                    variant="outlined"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    sx={{ flexGrow: 1 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                />
                {/* --- PERBAIKAN DI SINI --- */}
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Add />}
                    onClick={() => navigate('/generator-rpp')} // Path URL diperbaiki
                >
                    Buat RPP Baru
                </Button>
            </Box>

            {loading && (
                <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                    <CircularProgress />
                    <Typography variant="h6" sx={{ ml: 2 }}>Memuat RPP...</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {!loading && !error && filteredRpps.length === 0 && (
                <Alert severity="info">Tidak ada RPP ditemukan. Silakan buat RPP baru.</Alert>
            )}

            {!loading && !error && filteredRpps.length > 0 && (
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="simple table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Judul RPP</TableCell>
                                <TableCell>Kelas</TableCell>
                                <TableCell>Tanggal Dibuat</TableCell>
                                <TableCell align="right">Aksi</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredRpps.map((rpp) => (
                                <TableRow
                                    key={rpp.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">
                                        <Button
                                            variant="text"
                                            onClick={() => navigate(`/rpp/${rpp.id}`)}
                                            sx={{ textTransform: 'none', justifyContent: 'flex-start', p: 0 }}
                                        >
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                {rpp.judul}
                                            </Typography>
                                        </Button>
                                    </TableCell>
                                    <TableCell>{rpp.nama_kelas}</TableCell>
                                    <TableCell>{rpp.tanggal_dibuat}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            aria-label="view"
                                            onClick={() => navigate(`/rpp/${rpp.id}`)}
                                            color="info"
                                        >
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            aria-label="edit"
                                            onClick={() => handleEditClick(rpp.id)}
                                            color="primary"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            aria-label="delete"
                                            onClick={() => handleDeleteClick(rpp.id)}
                                            color="error"
                                        >
                                            <Delete />
                                        </IconButton>
                                        <IconButton
                                            aria-label="download"
                                            onClick={() => handleDownloadPdf(rpp.id, rpp.judul)}
                                            color="success"
                                        >
                                            <Download />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Edit RPP Dialog */}
            <Dialog open={openEditDialog} onClose={handleEditDialogClose}>
                <DialogTitle>Edit RPP</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="judul"
                        label="Judul RPP"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={editForm.judul}
                        onChange={handleEditFormChange}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth variant="outlined">
                        <InputLabel id="kelas-select-label">Kelas</InputLabel>
                        <Select
                            labelId="kelas-select-label"
                            name="kelas_id"
                            value={editForm.kelas_id}
                            onChange={handleEditFormChange}
                            label="Kelas"
                        >
                            {kelasList.map((kelas) => (
                                <MenuItem key={kelas.id} value={kelas.id}>
                                    {kelas.nama_kelas}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                        *Untuk mengubah konten RPP, gunakan fitur "Buat RPP Baru" atau edit secara manual di halaman detail RPP jika memungkinkan.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditDialogClose} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleEditSubmit} color="primary" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Simpan'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete RPP Confirmation Dialog */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleDeleteDialogClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Konfirmasi Hapus RPP"}</DialogTitle>
                <DialogContent>
                    <Typography id="alert-dialog-description">
                        Apakah Anda yakin ingin menghapus RPP "{currentRpp?.judul}"? Tindakan ini tidak dapat dibatalkan.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteDialogClose} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleDeleteConfirm} color="error" autoFocus disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Hapus'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default RppLibraryPage;