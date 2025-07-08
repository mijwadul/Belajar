// frontend/src/pages/admin/UserManagementPage.jsx

import React, { useEffect, useState } from 'react';
import { getAllUsers, createUser, deleteUser } from '../../api/authService';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Alert, Box, Button, Dialog,
    DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem,
    FormControl, InputLabel, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    
    // State untuk modal tambah pengguna
    const [openModal, setOpenModal] = useState(false);
    const [newUser, setNewUser] = useState({
        nama_lengkap: '',
        email: '',
        password: '',
        role: 'Guru', // Default role
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers();
            setUsers(data);
        } catch (err) {
            setPageError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setFormError(''); // Reset error form saat modal ditutup
        setNewUser({ nama_lengkap: '', email: '', password: '', role: 'Guru' }); // Reset form
    };

    const handleInputChange = (e) => {
        setNewUser({ ...newUser, [e.target.name]: e.target.value });
    };

    const handleFormSubmit = async () => {
        if (!newUser.nama_lengkap || !newUser.email || !newUser.password) {
            setFormError('Semua field wajib diisi.');
            return;
        }
        
        try {
            await createUser(newUser);
            handleCloseModal(); // Tutup modal jika berhasil
            await fetchUsers(); // Muat ulang daftar pengguna
        } catch (err) {
            setFormError(err.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        // Tampilkan dialog konfirmasi browser
        if (window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
            try {
                await deleteUser(userId);
                // Muat ulang daftar pengguna agar data terbarui
                fetchUsers();
            } catch (err) {
                setPageError(err.message);
            }
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    Manajemen Pengguna
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenModal}>
                    Tambah Pengguna
                </Button>
            </Box>
            
            {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}

            {/* 3. BAGIAN TABEL YANG DIKEMBALIKAN */}
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="Tabel Pengguna">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nama Lengkap</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Peran</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Aksi</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>{user.id}</TableCell>
                                <TableCell>{user.nama_lengkap}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell align="center">
                                    <IconButton color="error" onClick={() => handleDeleteUser(user.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog/Modal untuk tambah pengguna */}
            <Dialog open={openModal} onClose={handleCloseModal}>
                <DialogTitle>Buat Pengguna Baru</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="nama_lengkap" label="Nama Lengkap" type="text" fullWidth variant="outlined" value={newUser.nama_lengkap} onChange={handleInputChange} />
                    <TextField margin="dense" name="email" label="Alamat Email" type="email" fullWidth variant="outlined" value={newUser.email} onChange={handleInputChange} />
                    <TextField margin="dense" name="password" label="Password" type="password" fullWidth variant="outlined" value={newUser.password} onChange={handleInputChange} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Peran</InputLabel>
                        <Select name="role" value={newUser.role} label="Peran" onChange={handleInputChange}>
                            <MenuItem value="Guru">Guru</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                    {formError && <Alert severity="error" sx={{ mt: 2 }}>{formError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Batal</Button>
                    <Button onClick={handleFormSubmit} variant="contained">Simpan</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
}

export default UserManagementPage;