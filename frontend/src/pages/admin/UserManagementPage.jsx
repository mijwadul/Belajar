// frontend/src/pages/admin/UserManagementPage.jsx

import React, { useEffect, useState } from 'react';
import { getAllUsers } from '../../api/authService';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Box
} from '@mui/material';

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const data = await getAllUsers();
                setUsers(data);
            } catch (err) {
                // Set pesan error dari service jika ada, jika tidak, gunakan pesan default
                setError(err.message || 'Terjadi kesalahan saat memuat data.');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []); // Array dependency kosong berarti useEffect hanya berjalan sekali saat komponen dimuat

    // Tampilkan indikator loading saat data sedang diambil
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Tampilkan pesan error jika terjadi kegagalan
    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    // Tampilkan tabel jika data berhasil diambil
    return (
        <Container maxWidth="lg">
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Manajemen Pengguna
            </Typography>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nama Lengkap</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Peran</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow
                                key={user.id}
                                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                            >
                                <TableCell component="th" scope="row">{user.id}</TableCell>
                                <TableCell>{user.nama_lengkap}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.role}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}

export default UserManagementPage;