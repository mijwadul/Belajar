// frontend/src/pages/RppLibraryPage.jsx

import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Menggunakan Link dari react-router-dom sebagai RouterLink
import { getAllRpps } from '../api/aiService'; // Memastikan fungsi ini ada dan diimpor
import {
    Container, Box, Typography, Paper,
    Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
    CircularProgress, // Untuk indikator loading
    Link // Untuk styling Link dari MUI
} from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories'; // Ikon untuk perpustakaan RPP

function RppLibraryPage() {
    const [rppList, setRppList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const muatData = async () => {
            try {
                const data = await getAllRpps();
                setRppList(data);
            } catch (error) {
                console.error("Gagal memuat RPP:", error);
                // Opsional: tampilkan snackbar error
            } finally {
                setIsLoading(false);
            }
        };
        muatData();
    }, []);

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                <AutoStoriesIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 'inherit' }} /> Perpustakaan RPP
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom align="center" sx={{ mb: 4 }}>
                Berikut adalah daftar semua RPP yang pernah Anda simpan.
            </Typography>

            <Paper elevation={3} sx={{ p: 3, borderRadius: '12px', overflow: 'hidden' }}> {/* Menggunakan Paper untuk card */}
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <CircularProgress />
                        <Typography sx={{ ml: 2, color: 'text.secondary' }}>Memuat perpustakaan RPP...</Typography>
                    </Box>
                ) : rppList.length > 0 ? (
                    <TableContainer>
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableHead sx={{ backgroundColor: 'action.hover' }}> {/* Styling header tabel */}
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Judul RPP</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Kelas Terkait</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Tanggal Dibuat</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rppList.map((rpp) => (
                                    <TableRow
                                        key={rpp.id}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell component="th" scope="row">
                                            <Link component={RouterLink} to={`/rpp/${rpp.id}`} sx={{ textDecoration: 'none', color: 'primary.main', fontWeight: 'medium' }}>
                                                {rpp.judul}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{rpp.nama_kelas}</TableCell>
                                        <TableCell>{rpp.tanggal_dibuat}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Box sx={{ p: 5, textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary">
                            Perpustakaan RPP masih kosong.
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                            Silakan buat RPP baru dari halaman "Generator RPP".
                        </Typography>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default RppLibraryPage;