// frontend/src/pages/admin/UserManagementPage.jsx

import React, { useEffect, useState } from 'react';
import {
    getAllUsers,
    createUser,
    deleteUser,
    getUserById,
    updateUser,
} from '../../api/authService';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Alert, Box, Button, Dialog,
    DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem,
    FormControl, InputLabel, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');

    // State untuk modal Tambah Pengguna
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        nama_lengkap: '',
        email: '',
        password: '',
        role: 'Guru',
    });
    const [addFormError, setAddFormError] = useState('');

    // State untuk modal Edit Pengguna
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [editPassword, setEditPassword] = useState('');
    const [editFormError, setEditFormError] = useState('');

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

    // --- FUNGSI UNTUK MODAL TAMBAH PENGGUNA ---
    const handleOpenAddModal = () => setAddModalOpen(true);

    const handleCloseAddModal = () => {
        setAddModalOpen(false);
        setAddFormError('');
        setNewUser({ nama_lengkap: '', email: '', password: '', role: 'Guru' });
    };

    const handleNewUserChange = (e) => {
        setNewUser({ ...newUser, [e.target.name]: e.target.value });
    };

    const handleAddFormSubmit = async () => {
        if (!newUser.nama_lengkap || !newUser.email || !newUser.password) {
            setAddFormError('Semua field wajib diisi.');
            return;
        }
        try {
            const result = await createUser(newUser);
            handleCloseAddModal();
            setPageSuccess(result.message || 'Pengguna berhasil ditambahkan!');
            await fetchUsers();
        } catch (err) {
            setAddFormError(err.message);
        }
    };

    // --- FUNGSI UNTUK MODAL EDIT PENGGUNA ---
    const handleOpenEditModal = async (userId) => {
        try {
            const userData = await getUserById(userId);
            setUserToEdit(userData);
            setEditModalOpen(true);
        } catch (err) {
            setPageError(err.message);
        }
    };

    const handleCloseEditModal = () => {
        setEditModalOpen(false);
        setEditFormError('');
        setUserToEdit(null);
        setEditPassword('');
    };

    const handleEditUserChange = (e) => {
        setUserToEdit({ ...userToEdit, [e.target.name]: e.target.value });
    };
    
    const handleEditFormSubmit = async () => {
        if (!userToEdit) return;
        setEditFormError('');
        const payload = {
            nama_lengkap: userToEdit.nama_lengkap,
            email: userToEdit.email,
            role: userToEdit.role,
        };
        if (editPassword) {
            payload.password = editPassword;
        }

        try {
            const result = await updateUser(userToEdit.id, payload);
            handleCloseEditModal();
            setPageSuccess(result.message || 'Data pengguna berhasil diperbarui!');
            await fetchUsers();
        } catch (err) {
            setEditFormError(err.message);
        }
    };

    // --- FUNGSI UNTUK HAPUS PENGGUNA ---
    const handleDeleteUser = async (userId) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) {
            try {
                const result = await deleteUser(userId);
                setPageSuccess(result.message || 'Pengguna berhasil dihapus!');
                await fetchUsers();
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
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddModal}>
                    Tambah Pengguna
                </Button>
            </Box>
            
            {pageError && <Alert severity="error" onClose={() => setPageError('')} sx={{ mb: 2 }}>{pageError}</Alert>}
            {pageSuccess && <Alert severity="success" onClose={() => setPageSuccess('')} sx={{ mb: 2 }}>{pageSuccess}</Alert>}

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
                                    <IconButton color="primary" onClick={() => handleOpenEditModal(user.id)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => handleDeleteUser(user.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog/Modal untuk Tambah Pengguna */}
            <Dialog open={isAddModalOpen} onClose={handleCloseAddModal}>
                <DialogTitle>Buat Pengguna Baru</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="nama_lengkap" label="Nama Lengkap" type="text" fullWidth variant="outlined" value={newUser.nama_lengkap} onChange={handleNewUserChange} />
                    <TextField margin="dense" name="email" label="Alamat Email" type="email" fullWidth variant="outlined" value={newUser.email} onChange={handleNewUserChange} />
                    <TextField margin="dense" name="password" label="Password" type="password" fullWidth variant="outlined" value={newUser.password} onChange={handleNewUserChange} />
                    <FormControl fullWidth margin="dense">
                        <InputLabel>Peran</InputLabel>
                        <Select name="role" value={newUser.role} label="Peran" onChange={handleNewUserChange}>
                            <MenuItem value="Guru">Guru</MenuItem>
                            <MenuItem value="Admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                    {addFormError && <Alert severity="error" sx={{ mt: 2 }}>{addFormError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddModal}>Batal</Button>
                    <Button onClick={handleAddFormSubmit} variant="contained">Simpan</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog/Modal untuk Edit Pengguna */}
            <Dialog open={isEditModalOpen} onClose={handleCloseEditModal}>
                <DialogTitle>Edit Data Pengguna</DialogTitle>
                <DialogContent>
                    {userToEdit && (
                        <>
                            <TextField autoFocus margin="dense" name="nama_lengkap" label="Nama Lengkap" type="text" fullWidth variant="outlined" value={userToEdit.nama_lengkap} onChange={handleEditUserChange} />
                            <TextField margin="dense" name="email" label="Alamat Email" type="email" fullWidth variant="outlined" value={userToEdit.email} onChange={handleEditUserChange} />
                            <TextField margin="dense" name="password" label="Password Baru" type="password" fullWidth variant="outlined" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" />
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Peran</InputLabel>
                                <Select name="role" value={userToEdit.role} label="Peran" onChange={handleEditUserChange}>
                                    <MenuItem value="Guru">Guru</MenuItem>
                                    <MenuItem value="Admin">Admin</MenuItem>
                                    <MenuItem value="Super User">Super User</MenuItem>
                                </Select>
                            </FormControl>
                        </>
                    )}
                    {editFormError && <Alert severity="error" sx={{ mt: 2 }}>{editFormError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditModal}>Batal</Button>
                    <Button onClick={handleEditFormSubmit} variant="contained">Simpan Perubahan</Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}

export default UserManagementPage;