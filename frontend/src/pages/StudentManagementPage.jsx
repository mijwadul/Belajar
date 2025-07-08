import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { getKelasDetail, tambahSiswa, daftarkanSiswaKeKelas, updateSiswa, deleteSiswa, bulkImportSiswa } from '../api/classroomService'; // Import bulkImportSiswa
import * as XLSX from 'xlsx';

import {
    Container, Grid, Paper, Typography, Button, Box,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Select, MenuItem, FormControl, InputLabel,
    Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Checkbox,
    CircularProgress, Snackbar, Alert, IconButton, Tooltip,
    Input,
    List, ListItem, ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

// Define the expected fields for student data and their display names
const FIELD_MAPPING = [
    { key: 'nama_lengkap', label: 'Nama Lengkap', required: true },
    { key: 'nisn', label: 'NISN', required: true },
    { key: 'nis', label: 'NIS', required: false },
    { key: 'tempat_lahir', label: 'Tempat Lahir', required: false },
    { key: 'tanggal_lahir', label: 'Tanggal Lahir (YYYY-MM-DD)', required: false },
    { key: 'jenis_kelamin', label: 'Jenis Kelamin', required: false },
    { key: 'agama', label: 'Agama', required: false },
    { key: 'alamat', label: 'Alamat', required: false },
    { key: 'nomor_hp', label: 'Nomor HP', required: false },
];

function StudentManagementPage() {
    const { id } = useParams();
    const [kelas, setKelas] = useState(null);
    const [daftarSiswa, setDaftarSiswa] = useState([]);
    
    const initialFormState = {
        nama_lengkap: '', nisn: '', nis: '', tempat_lahir: '', tanggal_lahir: '',
        jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: '', nomor_hp: ''
    };
    const [formSiswa, setFormSiswa] = useState(initialFormState);

    // State for Edit Student Dialog (using Material-UI Dialog now)
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [siswaUntukDiedit, setSiswaUntukDiedit] = useState(null);

    // State for Upload Excel Dialog
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [excelData, setExcelData] = useState([]); // Raw data from Excel
    const [excelHeaders, setExcelHeaders] = useState([]); // Headers from Excel
    const [mappedHeaders, setMappedHeaders] = useState({}); // User's mapping of excel header to app field
    const [selectedStudentsToImport, setSelectedStudentsToImport] = useState([]); // Selected rows to import
    const [currentStep, setCurrentStep] = useState(1); // 1: Mapping, 2: Preview

    // State for Loading and Snackbar Notifications
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false); // For bulk upload specific loading
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    useEffect(() => {
        muatDetailKelas();
    }, [id]);

    const muatDetailKelas = async () => {
        setIsLoading(true); // Set loading true when fetching data
        try {
            const detail = await getKelasDetail(id);
            setKelas(detail);
            setDaftarSiswa(detail.siswa);
        } catch (error) {
            console.error("Gagal memuat detail kelas:", error);
            showSnackbar('Gagal memuat detail kelas.', 'error');
        } finally {
            setIsLoading(false); // Set loading false after fetch
        }
    };

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

    const handleFormSiswaChange = (e) => {
        setFormSiswa({ ...formSiswa, [e.target.name]: e.target.value });
    };

    const handleTambahSiswa = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Validasi sederhana
            if (!formSiswa.nama_lengkap || !formSiswa.nisn) {
                showSnackbar('Nama Lengkap dan NISN wajib diisi.', 'warning');
                setIsLoading(false);
                return;
            }

            const responsSiswa = await tambahSiswa(formSiswa);
            await daftarkanSiswaKeKelas(id, responsSiswa.id_siswa);
            showSnackbar(`Siswa "${formSiswa.nama_lengkap}" berhasil ditambahkan!`, 'success');
            muatDetailKelas();
            setFormSiswa(initialFormState); // Reset form
        } catch (error) {
            console.error('Gagal menambah siswa:', error);
            showSnackbar(error.message || 'Gagal menambahkan siswa.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const bukaModalEdit = (siswa) => {
        const tgl = siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '';
        setSiswaUntukDiedit({ ...siswa, tanggal_lahir: tgl });
        setEditModalOpen(true);
    };
    
    const tutupModalEdit = () => setEditModalOpen(false);

    const handleUpdateSiswa = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateSiswa(siswaUntukDiedit.id, siswaUntukDiedit);
            showSnackbar('Data siswa berhasil diperbarui!', 'success');
            tutupModalEdit();
            muatDetailKelas();
        } catch (error) {
            console.error(error);
            showSnackbar(error.message || 'Gagal memperbarui data siswa.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleHapusSiswa = async (idSiswa, namaSiswa) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${namaSiswa}"?`)) {
            setIsLoading(true);
            try {
                await deleteSiswa(idSiswa);
                showSnackbar('Siswa berhasil dihapus.', 'success');
                muatDetailKelas();
            } catch (error) {
                console.error(error);
                showSnackbar(error.message || 'Gagal menghapus siswa.', 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    // --- Excel Upload Functions ---
    const handleOpenUploadDialog = () => {
        setUploadDialogOpen(true);
        setCurrentStep(1); // Always start at mapping step
        setExcelData([]);
        setExcelHeaders([]);
        setMappedHeaders({});
        setSelectedStudentsToImport([]);
    };

    const handleCloseUploadDialog = () => {
        setUploadDialogOpen(false);
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get data as array of arrays

                    if (json.length === 0 || json.length === 1 && json[0].every(cell => !cell)) { // Check for empty or only headers
                        showSnackbar('File Excel kosong atau tidak ada data siswa.', 'warning');
                        handleCloseUploadDialog();
                        return;
                    }

                    const headers = json[0]; // First row is headers
                    const rows = json.slice(1); // Rest are data rows

                    setExcelHeaders(headers);
                    setExcelData(rows);

                    // Auto-map headers
                    const autoMapped = {};
                    FIELD_MAPPING.forEach(field => {
                        const detectedHeader = headers.find(h => 
                            h && (
                                h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.label.toLowerCase().replace(/[^a-z0-9]/g, '') ||
                                h.toLowerCase().replace(/[^a-z0-9]/g, '') === field.key.toLowerCase().replace(/[^a-z0-9]/g, '')
                            )
                        );
                        if (detectedHeader) {
                            autoMapped[field.key] = detectedHeader;
                        }
                    });
                    setMappedHeaders(autoMapped);
                    
                    // Default select all rows for import
                    setSelectedStudentsToImport(rows.map((_, index) => index));
                    setCurrentStep(1); // Stay on mapping step first
                    setUploadDialogOpen(true); // Open the dialog
                } catch (error) {
                    console.error('Error reading Excel file:', error);
                    showSnackbar('Gagal membaca file Excel. Pastikan formatnya benar.', 'error');
                    handleCloseUploadDialog();
                } finally {
                    setIsUploading(false);
                    // Clear the file input after processing to allow re-uploading the same file
                    event.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleMappingChange = (appFieldKey, excelHeader) => {
        setMappedHeaders(prev => ({
            ...prev,
            [appFieldKey]: excelHeader === '' ? undefined : excelHeader // Use undefined for unselected
        }));
    };

    // Prepare data based on current mapping for preview and final import
    const getProcessedExcelData = () => {
        if (!excelData || excelData.length === 0) return [];
        
        return excelData.map(row => {
            const student = {};
            FIELD_MAPPING.forEach(field => {
                const excelHeader = mappedHeaders[field.key];
                if (excelHeader !== undefined && excelHeaders.includes(excelHeader)) {
                    const headerIndex = excelHeaders.indexOf(excelHeader);
                    let value = row[headerIndex];
                    
                    // Special handling for date field
                    if (field.key === 'tanggal_lahir') {
                        // Attempt to parse as date, can be Excel number or string
                        if (typeof value === 'number') {
                            const excelDate = new Date(Date.UTC(0, 0, value - 1)); // -1 for Excel's 1900 leap year bug
                            student[field.key] = excelDate.toISOString().split('T')[0];
                        } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            student[field.key] = value; // Assume YYYY-MM-DD
                        } else {
                            student[field.key] = null; // Or handle as error
                        }
                    } else if (field.key === 'nomor_hp') {
                        student[field.key] = value ? String(value) : ''; // Ensure phone number is string
                    }
                    else {
                        student[field.key] = value;
                    }
                }
            });
            return student;
        });
    };

    const handleToggleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedStudentsToImport(excelData.map((_, index) => index));
        } else {
            setSelectedStudentsToImport([]);
        }
    };

    const handleToggleSelect = (index) => {
        setSelectedStudentsToImport(prev => 
            prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
        );
    };

    const handleConfirmMapping = () => {
        // Basic validation: check if all required fields are mapped
        const missingRequiredMapping = FIELD_MAPPING.some(field => 
            field.required && !mappedHeaders[field.key]
        );

        if (missingRequiredMapping) {
            showSnackbar('Semua kolom wajib harus dipetakan.', 'warning');
            return;
        }
        setCurrentStep(2); // Move to preview step
    };

    const handleImportSelectedStudents = async () => {
        setIsUploading(true);
        try {
            const studentsToImport = getProcessedExcelData().filter((_, index) => 
                selectedStudentsToImport.includes(index)
            );

            if (studentsToImport.length === 0) {
                showSnackbar('Tidak ada siswa yang dipilih untuk diimpor.', 'warning');
                setIsUploading(false);
                return;
            }

            // Panggil fungsi bulkImportSiswa dari classroomService
            const response = await bulkImportSiswa(id, studentsToImport); // id adalah id kelas

            showSnackbar(response.message || 'Impor selesai!', 'success');
            handleCloseUploadDialog();
            muatDetailKelas(); // Refresh student list
        } catch (error) {
            console.error('Kesalahan saat mengimpor siswa massal:', error);
            showSnackbar(error.message || 'Gagal mengimpor siswa massal.', 'error');
        } finally {
            setIsUploading(false);
        }
    };


    if (!kelas) return (
        <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Memuat data kelas...</Typography>
        </Container>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <RouterLink to={`/kelas/${kelas.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="outlined" startIcon={<InfoOutlinedIcon />}>
                        Kembali ke Detail Kelas
                    </Button>
                </RouterLink>
                <Typography variant="h4" component="h1" gutterBottom sx={{ mt: 2 }}>
                    Manajemen Siswa: {kelas.nama_kelas}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    {kelas.mata_pelajaran} ({kelas.jenjang})
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Kolom Kiri: Form Tambah Siswa (Manual) */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h5" component="h2" gutterBottom>
                            Tambah Siswa Baru (Manual)
                        </Typography>
                        <Box component="form" onSubmit={handleTambahSiswa} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                fullWidth
                                label="Nama Lengkap"
                                name="nama_lengkap"
                                value={formSiswa.nama_lengkap}
                                onChange={handleFormSiswaChange}
                                required
                            />
                            <TextField
                                fullWidth
                                label="NISN"
                                name="nisn"
                                value={formSiswa.nisn}
                                onChange={handleFormSiswaChange}
                                required
                            />
                            <TextField
                                fullWidth
                                label="NIS"
                                name="nis"
                                value={formSiswa.nis}
                                onChange={handleFormSiswaChange}
                            />
                            <TextField
                                fullWidth
                                label="Tempat Lahir"
                                name="tempat_lahir"
                                value={formSiswa.tempat_lahir}
                                onChange={handleFormSiswaChange}
                            />
                            <TextField
                                fullWidth
                                label="Tanggal Lahir"
                                type="date"
                                name="tanggal_lahir"
                                value={formSiswa.tanggal_lahir}
                                onChange={handleFormSiswaChange}
                                InputLabelProps={{ shrink: true }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Jenis Kelamin</InputLabel>
                                <Select
                                    name="jenis_kelamin"
                                    value={formSiswa.jenis_kelamin}
                                    label="Jenis Kelamin"
                                    onChange={handleFormSiswaChange}
                                >
                                    <MenuItem value="Laki-laki">Laki-laki</MenuItem>
                                    <MenuItem value="Perempuan">Perempuan</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Agama</InputLabel>
                                <Select
                                    name="agama"
                                    value={formSiswa.agama}
                                    label="Agama"
                                    onChange={handleFormSiswaChange}
                                >
                                    <MenuItem value="Islam">Islam</MenuItem>
                                    <MenuItem value="Kristen Protestan">Kristen Protestan</MenuItem>
                                    <MenuItem value="Kristen Katolik">Kristen Katolik</MenuItem>
                                    <MenuItem value="Hindu">Hindu</MenuItem>
                                    <MenuItem value="Buddha">Buddha</MenuItem>
                                    <MenuItem value="Konghucu">Konghucu</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Alamat Lengkap"
                                name="alamat"
                                multiline
                                rows={3}
                                value={formSiswa.alamat}
                                onChange={handleFormSiswaChange}
                            />
                            <TextField
                                fullWidth
                                label="Nomor HP Siswa"
                                name="nomor_hp"
                                value={formSiswa.nomor_hp}
                                onChange={handleFormSiswaChange}
                            />
                            <Button type="submit" variant="contained" disabled={isLoading}>
                                {isLoading ? <CircularProgress size={24} /> : 'Tambahkan Siswa'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* Kolom Kanan: Daftar Siswa & Upload Excel */}
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" component="h2">
                                Daftar Siswa di Kelas Ini ({daftarSiswa.length} siswa)
                            </Typography>
                            <Input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileUpload}
                                sx={{ display: 'none' }}
                                id="excel-upload-button"
                            />
                            <label htmlFor="excel-upload-button">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<UploadFileIcon />}
                                    disabled={isUploading || isLoading}
                                >
                                    {isUploading ? <CircularProgress size={24} /> : 'Unggah Siswa via Excel'}
                                </Button>
                            </label>
                        </Box>

                        {isLoading && daftarSiswa.length === 0 ? ( // Display loader only if initial list is empty
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                                <CircularProgress />
                            </Box>
                        ) : daftarSiswa.length === 0 ? (
                            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 3 }}>
                                Belum ada siswa di kelas ini.
                            </Typography>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>No.</TableCell>
                                            <TableCell>Nama Lengkap</TableCell>
                                            <TableCell>NISN</TableCell>
                                            <TableCell>Jenis Kelamin</TableCell>
                                            <TableCell>Aksi</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {daftarSiswa.map((siswa, index) => (
                                            <TableRow key={siswa.id}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{siswa.nama_lengkap}</TableCell>
                                                <TableCell>{siswa.nisn || 'N/A'}</TableCell>
                                                <TableCell>{siswa.jenis_kelamin}</TableCell>
                                                <TableCell>
                                                    <IconButton color="primary" onClick={() => bukaModalEdit(siswa)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton color="error" onClick={() => handleHapusSiswa(siswa.id, siswa.nama_lengkap)}>
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

            {/* Dialog untuk Edit Siswa */}
            <Dialog open={editModalOpen} onClose={tutupModalEdit}>
                {siswaUntukDiedit && (
                    <>
                        <DialogTitle>Edit Data Siswa: {siswaUntukDiedit.nama_lengkap}</DialogTitle>
                        <DialogContent dividers>
                            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                                <TextField fullWidth label="Nama Lengkap" name="nama_lengkap" value={siswaUntukDiedit.nama_lengkap || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nama_lengkap: e.target.value})} required />
                                <TextField fullWidth label="NISN" name="nisn" value={siswaUntukDiedit.nisn || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nisn: e.target.value})} />
                                <TextField fullWidth label="NIS" name="nis" value={siswaUntukDiedit.nis || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nis: e.target.value})} />
                                <TextField fullWidth label="Tempat Lahir" name="tempat_lahir" value={siswaUntukDiedit.tempat_lahir || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, tempat_lahir: e.target.value})} />
                                <TextField fullWidth label="Tanggal Lahir" type="date" name="tanggal_lahir" value={siswaUntukDiedit.tanggal_lahir || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, tanggal_lahir: e.target.value})} InputLabelProps={{ shrink: true }} />
                                <FormControl fullWidth>
                                    <InputLabel>Jenis Kelamin</InputLabel>
                                    <Select name="jenis_kelamin" value={siswaUntukDiedit.jenis_kelamin || 'Laki-laki'} label="Jenis Kelamin" onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, jenis_kelamin: e.target.value})}>
                                        <MenuItem value="Laki-laki">Laki-laki</MenuItem>
                                        <MenuItem value="Perempuan">Perempuan</MenuItem>
                                    </Select>
                                </FormControl>
                                <FormControl fullWidth>
                                    <InputLabel>Agama</InputLabel>
                                    <Select name="agama" value={siswaUntukDiedit.agama || 'Islam'} label="Agama" onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, agama: e.target.value})}>
                                        <MenuItem value="Islam">Islam</MenuItem>
                                        <MenuItem value="Kristen Protestan">Kristen Protestan</MenuItem>
                                        <MenuItem value="Kristen Katolik">Kristen Katolik</MenuItem>
                                        <MenuItem value="Hindu">Hindu</MenuItem>
                                        <MenuItem value="Buddha">Buddha</MenuItem>
                                        <MenuItem value="Konghucu">Konghucu</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField fullWidth label="Alamat Lengkap" name="alamat" multiline rows={3} value={siswaUntukDiedit.alamat || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, alamat: e.target.value})} />
                                <TextField fullWidth label="Nomor HP Siswa" name="nomor_hp" value={siswaUntukDiedit.nomor_hp || ''} onChange={(e) => setSiswaUntukDiedit({...siswaUntukDiedit, nomor_hp: e.target.value})} />
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={tutupModalEdit} color="secondary">
                                Batal
                            </Button>
                            <Button onClick={handleUpdateSiswa} variant="contained" disabled={isLoading}>
                                {isLoading ? <CircularProgress size={24} /> : 'Simpan Perubahan'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Dialog untuk Unggah Siswa via Excel */}
            <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    Unggah Siswa via Excel - Langkah {currentStep} dari 2
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseUploadDialog}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            color: (theme) => theme.palette.grey[500],
                            transform: 'rotate(45deg)'
                        }}
                    >
                        <AddIcon /> {/* Close icon is AddIcon rotated */}
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {isUploading ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
                            <CircularProgress sx={{ mb: 2 }} />
                            <Typography>Memproses file Excel...</Typography>
                        </Box>
                    ) : (
                        <>
                            {currentStep === 1 && (
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Langkah 1: Petakan Kolom Excel ke Field Aplikasi
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Pilih kolom dari file Excel Anda yang sesuai dengan setiap field data siswa di aplikasi. Pastikan field yang *wajib* sudah terisi.
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {FIELD_MAPPING.map(field => (
                                            <Grid item xs={12} sm={6} key={field.key}>
                                                <FormControl fullWidth required={field.required}>
                                                    <InputLabel>{field.label} {field.required && '*'}</InputLabel>
                                                    <Select
                                                        value={mappedHeaders[field.key] || ''}
                                                        label={`${field.label} ${field.required ? '*' : ''}`}
                                                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                    >
                                                        <MenuItem value="">
                                                            <em>Tidak Ada</em>
                                                        </MenuItem>
                                                        {excelHeaders.map(header => (
                                                            <MenuItem key={header} value={header}>
                                                                {header}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {field.required && !mappedHeaders[field.key] && (
                                                        <Typography variant="caption" color="error">Wajib dipetakan</Typography>
                                                    )}
                                                </FormControl>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}

                            {currentStep === 2 && (
                                <Box>
                                    <Typography variant="h6" gutterBottom>
                                        Langkah 2: Pratinjau Data dan Pilih Siswa untuk Diimpor
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Centang siswa yang ingin Anda impor. Anda dapat meninjau data yang dipetakan di bawah ini.
                                    </Typography>
                                    <TableContainer component={Paper} elevation={1}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            icon={<CheckBoxOutlineBlankIcon />}
                                                            checkedIcon={<CheckBoxIcon />}
                                                            checked={selectedStudentsToImport.length === excelData.length && excelData.length > 0}
                                                            onChange={handleToggleSelectAll}
                                                            inputProps={{ 'aria-label': 'select all students' }}
                                                        />
                                                    </TableCell>
                                                    {FIELD_MAPPING.map(field => (
                                                        mappedHeaders[field.key] && ( // Only show mapped columns
                                                            <TableCell key={field.key}>{field.label}</TableCell>
                                                        )
                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {getProcessedExcelData().map((student, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell padding="checkbox">
                                                            <Checkbox
                                                                icon={<CheckBoxOutlineBlankIcon />}
                                                                checkedIcon={<CheckBoxIcon />}
                                                                checked={selectedStudentsToImport.includes(index)}
                                                                onChange={() => handleToggleSelect(index)}
                                                            />
                                                        </TableCell>
                                                        {FIELD_MAPPING.map(field => (
                                                            mappedHeaders[field.key] && (
                                                                <TableCell key={field.key}>
                                                                    {student[field.key] !== undefined ? String(student[field.key]) : ''}
                                                                </TableCell>
                                                            )
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUploadDialog} color="secondary">
                        Batal
                    </Button>
                    {currentStep === 1 && (
                        <Button onClick={handleConfirmMapping} variant="contained" disabled={isUploading || excelData.length === 0}>
                            Lanjutkan ke Pratinjau
                        </Button>
                    )}
                    {currentStep === 2 && (
                        <>
                            <Button onClick={() => setCurrentStep(1)} variant="outlined">
                                Kembali ke Pemetaan
                            </Button>
                            <Button onClick={handleImportSelectedStudents} variant="contained" disabled={isUploading || selectedStudentsToImport.length === 0}>
                                {isUploading ? <CircularProgress size={24} /> : `Impor ${selectedStudentsToImport.length} Siswa`}
                            </Button>
                        </>
                    )}
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

export default StudentManagementPage;