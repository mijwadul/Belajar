// frontend/src/pages/admin/UserManagementPage.jsx

import React, { useEffect, useState } from 'react';
import {
    getAllUsers,
    createUser,
    deleteUser,
    getUserById,
    updateUser,
    createSekolah,
    getAllSekolah,
} from '../../api/authService';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, CircularProgress, Alert, Box, Button, Dialog,
    DialogActions, DialogContent, DialogTitle, TextField, Select, MenuItem,
    FormControl, InputLabel, IconButton, Grid, Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [pageSuccess, setPageSuccess] = useState('');
    
    // --- PERUBAHAN: State untuk menyimpan daftar sekolah ---
    const [sekolahList, setSekolahList] = useState([]);

    // --- PERUBAHAN: State untuk modal Tambah Pengguna ---
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({
        nama_lengkap: '',
        email: '',
        password: '',
        role: 'Guru',
        sekolah_id: '', // <-- Tambahkan properti sekolah_id
    });
    const [addFormError, setAddFormError] = useState('');

    // --- PERUBAHAN: State untuk modal Edit Pengguna ---
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [editPassword, setEditPassword] = useState('');
    const [editFormError, setEditFormError] = useState('');

    // --- PERUBAHAN: State baru untuk modal Tambah Sekolah ---
    const [isSekolahModalOpen, setSekolahModalOpen] = useState(false);
    const [newSekolah, setNewSekolah] = useState({ nama_sekolah: '', alamat: '' });
    const [sekolahFormError, setSekolahFormError] = useState('');

    const fetchInitialData = async () => {
        // ... (fungsi ini tidak berubah)
    };

    useEffect(() => {
        fetchInitialData();
    }, []);
    
    // --- PERUBAHAN: Handler untuk Modal Tambah Sekolah ---
    const handleOpenSekolahModal = () => setSekolahModalOpen(true);
    const handleCloseSekolahModal = () => {
        setSekolahModalOpen(false);
        setNewSekolah({ nama_sekolah: '', alamat: '' });
        setSekolahFormError('');
    };
    const handleNewSekolahChange = (e) => {
        setNewSekolah({ ...newSekolah, [e.target.name]: e.target.value });
    };
    const handleCreateSekolahSubmit = async () => {
        if (!newSekolah.nama_sekolah) {
            setSekolahFormError('Nama sekolah wajib diisi.');
            return;
        }
        try {
            const result = await createSekolah(newSekolah);
            setPageSuccess(result.message || 'Sekolah baru berhasil ditambahkan!');
            handleCloseSekolahModal();
            // Refresh daftar sekolah agar langsung muncul di dropdown
            const updatedSekolahList = await getAllSekolah();
            setSekolahList(updatedSekolahList);
        } catch (err) {
            setSekolahFormError(err.message || 'Gagal menambahkan sekolah.');
        }
    };
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            setPageError('');
            try {
                const usersData = await getAllUsers();
                const sekolahData = await getAllSekolah();
                setUsers(usersData);
                setSekolahList(sekolahData);
            } catch (err) {
                setPageError(err.message || 'Gagal memuat data awal.');
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (err) {
            setPageError(err.message);
        }
    };
    
    const handleOpenAddModal = () => setAddModalOpen(true);
    
    const handleCloseAddModal = () => {
        setAddModalOpen(false);
        setAddFormError('');
        setNewUser({ nama_lengkap: '', email: '', password: '', role: 'Guru', sekolah_id: '' });
    };

    const handleNewUserChange = (e) => {
        setNewUser({ ...newUser, [e.target.name]: e.target.value });
    };

    const handleAddFormSubmit = async () => {
        setAddFormError('');
        if (!newUser.nama_lengkap || !newUser.email || !newUser.password) {
            setAddFormError('Nama, email, dan password wajib diisi.');
            return;
        }
        if ((newUser.role === 'Guru' || newUser.role === 'Admin') && !newUser.sekolah_id) {
            setAddFormError('Sekolah wajib dipilih untuk peran Guru dan Admin.');
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

        if ((userToEdit.role === 'Guru' || userToEdit.role === 'Admin') && !userToEdit.sekolah_id) {
            setEditFormError('Sekolah wajib dipilih untuk peran Guru dan Admin.');
            return;
        }

        const payload = {
            nama_lengkap: userToEdit.nama_lengkap,
            email: userToEdit.email,
            role: userToEdit.role,
            sekolah_id: userToEdit.sekolah_id || null, // Kirim null jika tidak ada
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 4 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    Manajemen Pengguna
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<BusinessIcon />} onClick={handleOpenSekolahModal}>
                        Tambah Sekolah
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddModal}>
                    Tambah Pengguna
                    </Button>
                </Stack>
            </Box>
            
            {pageError && <Alert severity="error" onClose={() => setPageError('')} sx={{ mb: 2 }}>{pageError}</Alert>}
            {pageSuccess && <Alert severity="success" onClose={() => setPageSuccess('')} sx={{ mb: 2 }}>{pageSuccess}</Alert>}

            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="Tabel Pengguna">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nama Lengkap</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Peran</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Sekolah</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Aksi</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.nama_lengkap}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>{user.nama_sekolah || 'N/A'}</TableCell>
                                <TableCell align="center">
                                    <IconButton color="primary" onClick={() => handleOpenEditModal(user.id)}><EditIcon /></IconButton>
                                    <IconButton color="error" onClick={() => handleDeleteUser(user.id)}><DeleteIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* --- PERUBAHAN: Dialog/Modal untuk Tambah Pengguna --- */}
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
                    {(newUser.role === 'Guru' || newUser.role === 'Admin') && (
                        <FormControl fullWidth margin="dense" required>
                            <InputLabel>Sekolah</InputLabel>
                            <Select name="sekolah_id" value={newUser.sekolah_id} label="Sekolah" onChange={handleNewUserChange}>
                                <MenuItem value=""><em>-- Pilih Sekolah --</em></MenuItem>
                                {sekolahList.map((sekolah) => (
                                    <MenuItem key={sekolah.id} value={sekolah.id}>{sekolah.nama_sekolah}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                    {addFormError && <Alert severity="error" sx={{ mt: 2 }}>{addFormError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddModal}>Batal</Button>
                    <Button onClick={handleAddFormSubmit} variant="contained">Simpan</Button>
                </DialogActions>
            </Dialog>

            {/* --- PERUBAHAN: Dialog/Modal untuk Edit Pengguna --- */}
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
                            {(userToEdit.role === 'Guru' || userToEdit.role === 'Admin') && (
                                <FormControl fullWidth margin="dense" required>
                                    <InputLabel>Sekolah</InputLabel>
                                    <Select name="sekolah_id" value={userToEdit.sekolah_id || ''} label="Sekolah" onChange={handleEditUserChange}>
                                        <MenuItem value=""><em>-- Pilih Sekolah --</em></MenuItem>
                                        {sekolahList.map((sekolah) => (
                                            <MenuItem key={sekolah.id} value={sekolah.id}>{sekolah.nama_sekolah}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                        </>
                    )}
                    {editFormError && <Alert severity="error" sx={{ mt: 2 }}>{editFormError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditModal}>Batal</Button>
                    <Button onClick={handleEditFormSubmit} variant="contained">Simpan Perubahan</Button>
                </DialogActions>
            </Dialog>
            {/* --- PERUBAHAN: Modal baru untuk Tambah Sekolah --- */}
            <Dialog open={isSekolahModalOpen} onClose={handleCloseSekolahModal}>
                <DialogTitle>Buat Sekolah Baru</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        name="nama_sekolah"
                        label="Nama Sekolah"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newSekolah.nama_sekolah}
                        onChange={handleNewSekolahChange}
                    />
                    <TextField
                        margin="dense"
                        name="alamat"
                        label="Alamat Sekolah (Opsional)"
                        type="text"
                        fullWidth
                        multiline
                        rows={3}
                        variant="outlined"
                        value={newSekolah.alamat}
                        onChange={handleNewSekolahChange}
                    />
                    {sekolahFormError && <Alert severity="error" sx={{ mt: 2 }}>{sekolahFormError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSekolahModal}>Batal</Button>
                    <Button onClick={handleCreateSekolahSubmit} variant="contained">Simpan Sekolah</Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}

export default UserManagementPage;