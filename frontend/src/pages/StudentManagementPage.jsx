// frontend/src/pages/StudentManagementPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { 
    getKelasDetail, tambahSiswa, daftarkanSiswaKeKelas, 
    updateSiswa, deleteSiswa, bulkImportSiswa, getSiswaByKelas,
    bulkDeleteSiswa 
} from '../api/classroomService';
import * as XLSX from 'xlsx';

import {
    Container, Grid, Paper, Typography, Button, Box,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Select, MenuItem, FormControl, InputLabel,
    Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Checkbox,
    CircularProgress, Snackbar, Alert, IconButton, Tooltip,
    Input, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';


// Define the expected fields for student data and their display names
const FIELD_MAPPING = [
    { key: 'nama_lengkap', display: 'Nama Lengkap', required: true },
    { key: 'nisn', display: 'NISN', required: true },
    { key: 'nis', display: 'NIS' },
    { key: 'tempat_lahir', display: 'Tempat Lahir' },
    { key: 'tanggal_lahir', display: 'Tanggal Lahir (YYYY-MM-DD)' },
    { key: 'jenis_kelamin', display: 'Jenis Kelamin' },
    { key: 'agama', display: 'Agama' },
    { key: 'alamat', display: 'Alamat' },
    { key: 'nomor_hp', display: 'Nomor HP' },
    { key: 'nama_orang_tua', display: 'Nama Orang Tua' }
];

function StudentManagementPage() {
    const { id } = useParams();
    const [kelas, setKelas] = useState(null);
    const [daftarSiswa, setDaftarSiswa] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // State for Add Student Dialog
    const [openAddDialog, setOpenAddDialog] = useState(false);
    const [newStudentData, setNewStudentData] = useState({
        nama_lengkap: '', nisn: '', nis: '', tempat_lahir: '',
        tanggal_lahir: '', jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: '', nomor_hp: '', nama_orang_tua: ''
    });

    // State for Edit Student Dialog
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [editStudentData, setEditStudentData] = useState(null);

    // State for File Upload Dialog
    const [openFileUploadDialog, setOpenFileUploadDialog] = useState(false);
    const [excelFile, setExcelFile] = useState(null);
    const [rawExcelDataRows, setRawExcelDataRows] = useState([]);
    // GANTI BARIS INI:
    const [currentStep, setCurrentStep] = useState(1); // Perbaikan: Gunakan useState untuk inisialisasi
    // DENGAN BARIS INI:
    // const [currentStep, setCurrentStep] = useState(1);
    const [columnMapping, setColumnMapping] = useState({});
    const [excelHeadersRaw, setExcelHeadersRaw] = useState([]);
    const [processedPreviewData, setProcessedPreviewData] = useState([]);
    const [selectedStudentsForImport, setSelectedStudentsForImport] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // State for search and filter siswa
    const [searchQuery, setSearchQuery] = useState('');
    const [filterJenisKelamin, setFilterJenisKelamin] = useState('');
    const [filterAgama, setFilterAgama] = useState('');

    // State for bulk delete
    const [selectedStudentIds, setSelectedStudentIds] = useState([]);
    const [openBulkDeleteConfirmDialog, setOpenBulkDeleteConfirmDialog] = useState(false);


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

    // --- Data Fetching ---
    const muatDataSiswa = useCallback(async () => {
    setIsLoading(true);
    try {
        let dataSiswa = await getSiswaByKelas(id, searchQuery, filterJenisKelamin, filterAgama);
        console.log("Data siswa yang diterima dari API:", dataSiswa); // TAMBAHKAN BARIS INI

        // Perbaikan: Pastikan dataSiswa adalah array yang valid
        if (dataSiswa === null || dataSiswa === undefined || !Array.isArray(dataSiswa)) {
            console.warn("Received non-array data (or null/undefined) for students, defaulting to empty array.", dataSiswa);
            setDaftarSiswa([]); // Set to empty array if not an array
        } else {
            setDaftarSiswa(dataSiswa); // Set data jika berupa array
        }
        setSelectedStudentIds([]); // Clear selection on data reload
    } catch (error) {
        console.error("Error fetching students:", error);
        showSnackbar('Gagal memuat daftar siswa.', 'error');
        setDaftarSiswa([]); // Pastikan daftarSiswa kosong jika terjadi error
    } finally {
        setIsLoading(false);
    }
}, [id, searchQuery, filterJenisKelamin, filterAgama]);

    useEffect(() => {
        const fetchKelasDanSiswa = async () => {
            setIsLoading(true);
            try {
                const kelasDetail = await getKelasDetail(id);
                setKelas(kelasDetail);
                muatDataSiswa(); 
            }
            catch (error) {
                console.error("Error fetching class details or students:", error);
                showSnackbar('Gagal memuat detail kelas atau siswa.', 'error');
                setIsLoading(false);
                setKelas(null); // Pastikan kelas menjadi null jika ada error
            }
        };

        fetchKelasDanSiswa();
    }, [id, muatDataSiswa]);

    // --- Add Student Handlers ---
    const handleOpenAddDialog = () => {
        console.log('handleOpenAddDialog triggered: Opening Add Student Dialog');
        setNewStudentData({ // Reset form saat membuka
            nama_lengkap: '', nisn: '', nis: '', tempat_lahir: '',
            tanggal_lahir: '', jenis_kelamin: 'Laki-laki', agama: 'Islam', alamat: '', nomor_hp: ''
        });
        setOpenAddDialog(true);
    };

    const handleCloseAddDialog = () => {
        setOpenAddDialog(false);
    };

    const handleNewStudentChange = (e) => {
        setNewStudentData({ ...newStudentData, [e.target.name]: e.target.value });
    };

    const handleTambahSiswa = async (e) => {
        console.log('handleTambahSiswa triggered');
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        
        setIsLoading(true);
        try {
            if (!newStudentData.nama_lengkap || !newStudentData.nisn) {
                showSnackbar('Nama Lengkap dan NISN wajib diisi.', 'warning');
                setIsLoading(false);
                return;
            }
            console.log('Mengirim data siswa baru:', newStudentData);

            const responsSiswa = await tambahSiswa(newStudentData);
            console.log('Siswa berhasil ditambahkan secara global:', responsSiswa);

            if (responsSiswa && responsSiswa.id_siswa) {
                await daftarkanSiswaKeKelas(id, responsSiswa.id_siswa);
                console.log('Siswa berhasil didaftarkan ke kelas.');
            } else {
                throw new Error('Siswa berhasil ditambahkan, tetapi ID siswa tidak ditemukan untuk pendaftaran kelas.');
            }
            
            showSnackbar(`Siswa "${newStudentData.nama_lengkap}" berhasil ditambahkan dan didaftarkan!`, 'success');
            handleCloseAddDialog();
            muatDataSiswa();
        } catch (error) {
            console.error('Error adding and enrolling student:', error);
            showSnackbar(error.message || 'Gagal menambah atau mendaftarkan siswa.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Edit Student Handlers ---
    const handleOpenEditDialog = (siswa) => {
        const tgl = siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toISOString().split('T')[0] : '';
        setEditStudentData({ ...siswa, tanggal_lahir: tgl });
        setOpenEditDialog(true);
    };

    const handleCloseEditDialog = () => {
        setOpenEditDialog(false);
        setEditStudentData(null);
    };

    const handleEditStudentChange = (e) => {
        setEditStudentData({ ...editStudentData, [e.target.name]: e.target.value });
    };

    const handleUpdateSiswa = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateSiswa(editStudentData.id, editStudentData);
            showSnackbar('Data siswa berhasil diperbarui!', 'success');
            handleCloseEditDialog();
            muatDataSiswa();
        } catch (error) {
            console.error('Error updating student:', error);
            showSnackbar(error.message || 'Gagal memperbarui data siswa.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Delete Single Student Handler ---
    const handleDeleteSiswa = async (idSiswa, namaLengkap) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${namaLengkap}"? Aksi ini tidak dapat dibatalkan.`)) {
            setIsLoading(true);
            try {
                await deleteSiswa(idSiswa);
                showSnackbar(`Siswa "${namaLengkap}" berhasil dihapus.`, 'success');
                muatDataSiswa();
            } catch (error) {
                showSnackbar(error.message || 'Gagal menghapus siswa.', 'error');
                console.error("Error deleting student:", error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    // --- Bulk Delete Handlers ---
    const handleToggleStudentSelection = (studentId) => {
        setSelectedStudentIds(prevSelected =>
            prevSelected.includes(studentId)
                ? prevSelected.filter(id => id !== studentId)
                : [...prevSelected, studentId]
        );
    };

    const handleToggleSelectAllStudents = (event) => {
        if (event.target.checked) {
            const allStudentIds = daftarSiswa.map(siswa => siswa.id);
            setSelectedStudentIds(allStudentIds);
        } else {
            setSelectedStudentIds([]);
        }
    };

    const handleOpenBulkDeleteConfirmDialog = () => {
        setOpenBulkDeleteConfirmDialog(true);
    };

    const handleCloseBulkDeleteConfirmDialog = () => {
        setOpenBulkDeleteConfirmDialog(false);
    };

    const handleConfirmBulkDelete = async () => {
        setIsLoading(true);
        handleCloseBulkDeleteConfirmDialog();
        try {
            const response = await bulkDeleteSiswa(selectedStudentIds);
            showSnackbar(response.message || 'Siswa terpilih berhasil dihapus.', 'success');
            muatDataSiswa();
        } catch (error) {
            showSnackbar(error.message || 'Gagal menghapus siswa terpilih.', 'error');
            console.error("Error bulk deleting students:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- File Upload Handlers ---
    const handleOpenUploadDialog = () => {
        setOpenFileUploadDialog(true);
        setCurrentStep(1);
        setExcelFile(null);
        setRawExcelDataRows([]);
        setExcelHeadersRaw([]);
        setColumnMapping({});
        setProcessedPreviewData([]);
        setSelectedStudentsForImport([]);
        setIsUploading(false);
    };

    const handleCloseUploadDialog = () => {
        setOpenFileUploadDialog(false);
        setExcelFile(null);
        setRawExcelDataRows([]);
        setExcelHeadersRaw([]);
        setColumnMapping({});
        setProcessedPreviewData([]);
        setSelectedStudentsForImport([]);
        setCurrentStep(1);
        setIsUploading(false);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setExcelFile(file);
            setIsUploading(true);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const binaryStr = e.target.result;
                    const workbook = XLSX.read(binaryStr, { type: 'binary', cellDates: true, raw: false });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: "" }); 

                    if (json.length === 0 || (json.length === 1 && json[0].every(cell => !cell))) {
                        showSnackbar('File Excel kosong atau tidak ada data siswa.', 'warning');
                        handleCloseUploadDialog();
                        return;
                    }

                    const rawHeaders = json[0] || [];
                    setExcelHeadersRaw(rawHeaders);

                    const dataRows = json.slice(1);
                    setRawExcelDataRows(dataRows);

                    const initialMapping = {};
                    rawHeaders.forEach((headerValue, index) => {
                        const cleanHeader = (headerValue || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                        FIELD_MAPPING.forEach(field => {
                            const cleanFieldDisplay = field.display.toLowerCase().replace(/[^a-z0-9]/g, '');
                            if (cleanHeader === cleanFieldDisplay || cleanHeader === field.key.toLowerCase()) {
                                initialMapping[field.key] = index;
                            }
                        });
                    });
                    setColumnMapping(initialMapping);

                } catch (error) {
                    console.error('Error reading Excel file:', error);
                    showSnackbar('Gagal membaca file Excel. Pastikan formatnya benar.', 'error');
                    handleCloseUploadDialog();
                } finally {
                    setIsUploading(false);
                    event.target.value = '';
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleColumnMappingChange = (fieldKey, excelColIndex) => {
        setColumnMapping(prev => ({ ...prev, [fieldKey]: excelColIndex === '' ? undefined : parseInt(excelColIndex) }));
    };

    const processExcelRowToStudent = (row, mapping, headersRaw) => {
        const student = {};
        FIELD_MAPPING.forEach(field => {
            const excelIndex = mapping[field.key];
            let rawValue = excelIndex !== undefined ? row[excelIndex] : undefined;

            if (rawValue === undefined || rawValue === null || rawValue === '') {
                student[field.key] = '';
            } else if (field.key === 'tanggal_lahir') {
                let dateValue = rawValue;
                if (dateValue instanceof Date) {
                    student[field.key] = dateValue.toISOString().split('T')[0];
                } else if (typeof dateValue === 'number') {
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                    const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
                    student[field.key] = date.toISOString().split('T')[0];
                } else {
                    const parsedDate = new Date(dateValue);
                    if (!isNaN(parsedDate.getTime())) {
                        student[field.key] = parsedDate.toISOString().split('T')[0];
                    } else {
                        student[field.key] = String(dateValue);
                    }
                }
            } else {
                student[field.key] = String(rawValue).trim();
            }
        });

        student._isValid = FIELD_MAPPING.every(field => !field.required || (student[field.key] && student[field.key].trim() !== ''));
        return student;
    };


    const handleConfirmMapping = () => {
        const requiredFieldsMapped = FIELD_MAPPING.filter(field => field.required).every(field => 
            columnMapping.hasOwnProperty(field.key) && columnMapping[field.key] !== undefined
        );

        if (!requiredFieldsMapped) {
            showSnackbar("Pastikan semua kolom wajib (Nama Lengkap, NISN) sudah dipetakan.", "warning");
            return;
        }

        const processed = rawExcelDataRows.map(row => 
            processExcelRowToStudent(row, columnMapping, excelHeadersRaw)
        );
        setProcessedPreviewData(processed);
        setSelectedStudentsForImport(processed.filter(s => s._isValid));

        setCurrentStep(2);
    };


    const handleToggleSelectAll = (event) => {
        if (event.target.checked) {
            setSelectedStudentsForImport(processedPreviewData.filter(s => s._isValid));
        } else {
            setSelectedStudentsForImport([]);
        }
    };

    const handleToggleSelect = (toggledStudent) => {
        setSelectedStudentsForImport(prev => 
            prev.some(s => s.nisn === toggledStudent.nisn) 
                ? prev.filter(s => s.nisn !== toggledStudent.nisn) 
                : [...prev, toggledStudent]
        );
    };

    const handleImportSelectedStudents = async () => {
        setIsUploading(true);
        try {
            if (selectedStudentsForImport.length === 0) {
                showSnackbar('Tidak ada siswa yang dipilih untuk diimpor.', 'warning');
                setIsUploading(false);
                return;
            }

            const dataToUpload = selectedStudentsForImport.map(student => {
                const cleanStudent = { ...student };
                delete cleanStudent._isValid;
                return cleanStudent;
            });
            
            const response = await bulkImportSiswa(id, dataToUpload);

            let combinedMessage = response.message || 'Proses impor selesai.';
            if (response.errors && response.errors.length > 0) {
                combinedMessage += " Detail error:\n" + response.errors.join('\n');
            }
            showSnackbar(combinedMessage, response.fail_count > 0 ? 'warning' : 'success');

            handleCloseUploadDialog();
            muatDataSiswa();
        } catch (error) {
            console.error('Kesalahan saat mengimpor siswa massal:', error);
            showSnackbar(error.message || 'Gagal mengimpor siswa massal.', 'error');
        } finally {
            setIsUploading(false);
        }
    };


    // Options for Jenis Kelamin filter
    const jenisKelaminOptions = ['Laki-laki', 'Perempuan'];
    // Options for Agama filter (example)
    const agamaOptions = ['Islam', 'Kristen Protestan', 'Kristen Katolik', 'Hindu', 'Buddha', 'Konghucu'];


    if (isLoading && !kelas) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Memuat data kelas...</Typography>
            </Container>
        );
    }

    if (!kelas) {
        return <Typography sx={{ mt: 4, ml: 4 }}>Kelas tidak ditemukan.</Typography>;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 3 }}>
                <RouterLink to={`/kelas`} style={{ textDecoration: 'none' }}>
                    <Button variant="outlined" startIcon={<InfoOutlinedIcon />}>
                        Kembali ke Daftar Kelas
                    </Button>
                </RouterLink>
            </Box>

            <Typography variant="h4" component="h1" gutterBottom>
                Manajemen Siswa: {kelas.nama_kelas}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
                {kelas.mata_pelajaran} ({kelas.jenjang})
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleOpenAddDialog}
                        fullWidth
                    >
                        Tambah Siswa Baru (Manual)
                    </Button>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Button
                        variant="contained"
                        startIcon={<UploadFileIcon />}
                        onClick={handleOpenUploadDialog}
                        fullWidth
                    >
                        Import Siswa (Excel)
                    </Button>
                </Grid>
                {selectedStudentIds.length > 0 && (
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteForeverIcon />}
                            onClick={handleOpenBulkDeleteConfirmDialog}
                            fullWidth
                            disabled={isLoading}
                        >
                            Hapus {selectedStudentIds.length} Siswa Terpilih
                        </Button>
                    </Grid>
                )}
            </Grid>

            {/* Bagian Daftar Siswa */}
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h5" component="h2" gutterBottom>
                    Daftar Siswa di Kelas Ini ({daftarSiswa.length} siswa)
                </Typography>

                {/* Search and Filter Section for Students */}
                <Box sx={{ mb: 3 }}>
                    <TextField
                        fullWidth
                        label="Cari Siswa berdasarkan Nama"
                        variant="outlined"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
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
                        sx={{ mb: 2 }}
                    />
                    <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel>Jenis Kelamin</InputLabel>
                                <Select
                                    value={filterJenisKelamin}
                                    onChange={(e) => setFilterJenisKelamin(e.target.value)}
                                    label="Jenis Kelamin"
                                >
                                    <MenuItem value="">Semua</MenuItem>
                                    {jenisKelaminOptions.map((jk) => (
                                        <MenuItem key={jk} value={jk}>{jk}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <FormControl fullWidth variant="outlined">
                                <InputLabel>Agama</InputLabel>
                                <Select name="agama" value={filterAgama} label="Agama" onChange={(e) => setFilterAgama(e.target.value)}>
                                    <MenuItem value="">Semua</MenuItem>
                                    {agamaOptions.map((agama) => (
                                        <MenuItem key={agama} value={agama}>{agama}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        { (searchQuery || filterJenisKelamin || filterAgama) && (
                            <Grid item xs={12}>
                                <Button 
                                    fullWidth 
                                    variant="outlined" 
                                    onClick={() => { setSearchQuery(''); setFilterJenisKelamin(''); setFilterAgama(''); }} 
                                    startIcon={<ClearIcon />}
                                >
                                    Reset Filter
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </Box>

                {isLoading && daftarSiswa.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                        <CircularProgress />
                    </Box>
                ) : daftarSiswa.length === 0 ? (
                    <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mt: 3, py: 4 }}>
                        { (searchQuery || filterJenisKelamin || filterAgama) ?
                            "Tidak ada siswa yang cocok dengan kriteria pencarian/filter Anda." :
                            `Belum ada siswa di kelas ${kelas?.nama_kelas}. Silakan tambahkan.`
                        }
                    </Typography>
                ) : (
                    <TableContainer component={Paper} elevation={1}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {/* Checkbox untuk Select All */}
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            onChange={handleToggleSelectAllStudents}
                                            checked={selectedStudentIds.length === daftarSiswa.length && daftarSiswa.length > 0}
                                            indeterminate={selectedStudentIds.length > 0 && selectedStudentIds.length < daftarSiswa.length}
                                        />
                                    </TableCell>
                                    <TableCell>No.</TableCell>
                                    <TableCell>Nama Lengkap</TableCell>
                                    <TableCell>NISN</TableCell>
                                    <TableCell>Jenis Kelamin</TableCell>
                                    <TableCell>Tanggal Lahir</TableCell>
                                    <TableCell>Agama</TableCell>
                                    <TableCell>Nama Orang Tua</TableCell>
                                    <TableCell align="right">Aksi</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {daftarSiswa.map((siswa, index) => {
                                    const isItemSelected = selectedStudentIds.includes(siswa.id);
                                    return (
                                        <TableRow key={siswa.id} selected={isItemSelected}>
                                            {/* Checkbox untuk setiap siswa */}
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={isItemSelected}
                                                    onChange={() => handleToggleStudentSelection(siswa.id)}
                                                />
                                            </TableCell>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{siswa.nama_lengkap}</TableCell>
                                            <TableCell>{siswa.nisn || 'N/A'}</TableCell>
                                            <TableCell>{siswa.jenis_kelamin}</TableCell>
                                            <TableCell>{siswa.tanggal_lahir}</TableCell>
                                            <TableCell>{siswa.agama}</TableCell>
                                            <TableCell>{siswa.nama_orang_tua || '-'}</TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" onClick={() => handleOpenEditDialog(siswa)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteSiswa(siswa.id, siswa.nama_lengkap)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Dialog Tambah Siswa Baru (Manual) */}
            <Dialog open={openAddDialog} onClose={handleCloseAddDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Tambah Siswa Baru (Manual)</DialogTitle>
                <DialogContent dividers>
                    <Box component="form" id="add-student-form" onSubmit={handleTambahSiswa} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField fullWidth label="Nama Lengkap" name="nama_lengkap" value={newStudentData.nama_lengkap} onChange={handleNewStudentChange} required />
                        <TextField fullWidth label="NISN" name="nisn" value={newStudentData.nisn} onChange={handleNewStudentChange} required />
                        <TextField fullWidth label="NIS" name="nis" value={newStudentData.nis} onChange={handleNewStudentChange} />
                        <TextField fullWidth label="Tempat Lahir" name="tempat_lahir" value={newStudentData.tempat_lahir} onChange={handleNewStudentChange} />
                        <TextField fullWidth label="Tanggal Lahir (YYYY-MM-DD)" name="tanggal_lahir" type="date" value={newStudentData.tanggal_lahir} onChange={handleNewStudentChange} InputLabelProps={{ shrink: true }} />
                        <FormControl fullWidth>
                            <InputLabel>Jenis Kelamin</InputLabel>
                            <Select name="jenis_kelamin" value={newStudentData.jenis_kelamin} label="Jenis Kelamin" onChange={handleNewStudentChange}>
                                <MenuItem value="Laki-laki">Laki-laki</MenuItem>
                                <MenuItem value="Perempuan">Perempuan</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Nama Orang Tua" name="nama_orang_tua" value={newStudentData.nama_orang_tua} onChange={handleNewStudentChange} />
                        <FormControl fullWidth>
                            <InputLabel>Agama</InputLabel>
                            <Select name="agama" value={newStudentData.agama} label="Agama" onChange={handleNewStudentChange}>
                                <MenuItem value="Islam">Islam</MenuItem>
                                <MenuItem value="Kristen Protestan">Kristen Protestan</MenuItem>
                                <MenuItem value="Kristen Katolik">Kristen Katolik</MenuItem>
                                <MenuItem value="Hindu">Hindu</MenuItem>
                                <MenuItem value="Buddha">Buddha</MenuItem>
                                <MenuItem value="Konghucu">Konghucu</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField fullWidth label="Alamat Lengkap" name="alamat" multiline rows={3} value={newStudentData.alamat} onChange={handleNewStudentChange} />
                        <TextField fullWidth label="Nomor HP" name="nomor_hp" value={newStudentData.nomor_hp} onChange={handleNewStudentChange} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog} color="secondary">Batal</Button>
                    <Button
                        type="submit"
                        form="add-student-form"
                        variant="contained"
                        disabled={isLoading}
                        onClick={ (e) => { console.log('Button onClick triggered (fallback)'); if (!isLoading) handleTambahSiswa(e); } } 
                    >
                        {isLoading ? <CircularProgress size={24} /> : 'Tambahkan Siswa'}
                    </Button>
                </DialogActions>
            </Dialog>


            {/* Dialog Edit Siswa */}
            <Dialog open={openEditDialog} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Siswa</DialogTitle>
                <DialogContent dividers>
                    {editStudentData && (
                        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField fullWidth label="Nama Lengkap" name="nama_lengkap" value={editStudentData ? editStudentData.nama_lengkap : ''} onChange={handleEditStudentChange} required />
                            <TextField fullWidth label="NISN" name="nisn" value={editStudentData ? editStudentData.nisn : ''} onChange={handleEditStudentChange} />
                            <TextField fullWidth label="NIS" name="nis" value={editStudentData ? editStudentData.nis : ''} onChange={handleEditStudentChange} />
                            <TextField fullWidth label="Tempat Lahir" name="tempat_lahir" value={editStudentData ? editStudentData.tempat_lahir : ''} onChange={handleEditStudentChange} />
                            <TextField fullWidth label="Tanggal Lahir (YYYY-MM-DD)" type="date" name="tanggal_lahir" value={editStudentData ? editStudentData.tanggal_lahir : ''} onChange={handleEditStudentChange} InputLabelProps={{ shrink: true }} />
                            <FormControl fullWidth>
                                <InputLabel>Jenis Kelamin</InputLabel>
                                <Select name="jenis_kelamin" value={editStudentData ? (editStudentData.jenis_kelamin || 'Laki-laki') : 'Laki-laki'} label="Jenis Kelamin" onChange={handleEditStudentChange}>
                                    <MenuItem value="Laki-laki">Laki-laki</MenuItem>
                                    <MenuItem value="Perempuan">Perempuan</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Agama</InputLabel>
                                <Select name="agama" value={editStudentData ? (editStudentData.agama || 'Islam') : 'Islam'} label="Agama" onChange={handleEditStudentChange}>
                                    <MenuItem value="Islam">Islam</MenuItem>
                                    <MenuItem value="Kristen Protestan">Kristen Protestan</MenuItem>
                                    <MenuItem value="Kristen Katolik">Kristen Katolik</MenuItem>
                                    <MenuItem value="Hindu">Hindu</MenuItem>
                                    <MenuItem value="Buddha">Buddha</MenuItem>
                                    <MenuItem value="Konghucu">Konghucu</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField fullWidth label="Alamat Lengkap" name="alamat" value={editStudentData ? editStudentData.alamat : ''} multiline rows={3} onChange={handleEditStudentChange} />
                            <TextField fullWidth label="Nomor HP Siswa" name="nomor_hp" value={editStudentData ? editStudentData.nomor_hp : ''} onChange={handleEditStudentChange} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog} color="secondary">
                        Batal
                    </Button>
                    <Button onClick={handleUpdateSiswa} variant="contained" disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Simpan Perubahan'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog untuk Unggah Siswa via Excel */}
            <Dialog open={openFileUploadDialog} onClose={handleCloseUploadDialog} maxWidth="md" fullWidth>
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
                        <AddIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {isUploading && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
                            <CircularProgress sx={{ mb: 2 }} />
                            <Typography>Memproses file Excel...</Typography>
                        </Box>
                    )}

                    {!isUploading && currentStep === 1 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Langkah 1: Unggah File Excel dan Petakan Kolom
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Pilih file Excel (.xlsx atau .xls) yang berisi data siswa. Kemudian, petakan kolom dari file Excel Anda ke field aplikasi. Pastikan field yang *wajib* sudah terisi.
                            </Typography>
                            <Input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                fullWidth
                                sx={{ mb: 2 }}
                            />
                            {excelFile && (
                                <Typography variant="body2" color="text.secondary">
                                    File dipilih: {excelFile.name} ({rawExcelDataRows.length} baris data ditemukan)
                                </Typography>
                            )}

                            {rawExcelDataRows.length > 0 && (
                                <Box mt={3}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Pemetaan Kolom Excel
                                        <Tooltip title="Petakan kolom Excel Anda ke field yang sesuai di aplikasi.">
                                            <IconButton size="small">
                                                <InfoOutlinedIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {FIELD_MAPPING.map((field) => (
                                            <Grid item xs={12} sm={6} key={field.key}>
                                                <FormControl fullWidth variant="outlined" size="small" required={field.required}>
                                                    <InputLabel>{field.display} {field.required ? '*' : ''}</InputLabel>
                                                    <Select
                                                        value={columnMapping[field.key] !== undefined ? columnMapping[field.key] : ''}
                                                        onChange={(e) => handleColumnMappingChange(field.key, e.target.value)}
                                                        label={`${field.display} ${field.required ? '*' : ''}`}
                                                    >
                                                        <MenuItem value="">Pilih Kolom Excel</MenuItem>
                                                        {excelHeadersRaw.map((header, index) => (
                                                            header &&
                                                            <MenuItem key={header + index} value={index}> 
                                                                {String(header)}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                    {field.required && columnMapping[field.key] === undefined && (
                                                        <Typography variant="caption" color="error">Wajib dipetakan</Typography>
                                                    )}
                                                </FormControl>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}
                        </Box>
                    )}

                    {!isUploading && currentStep === 2 && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Langkah 2: Pratinjau Data dan Pilih Siswa untuk Diimpor
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Centang siswa yang ingin Anda impor. Hanya siswa yang memenuhi syarat (kolom wajib terisi) yang ditampilkan.
                            </Typography>
                            <TableContainer component={Paper} elevation={1} sx={{ maxHeight: 400, overflow: 'auto' }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    onChange={handleToggleSelectAll}
                                                    checked={selectedStudentsForImport.length > 0 && selectedStudentsForImport.length === processedPreviewData.filter(s => s._isValid).length}
                                                />
                                            </TableCell>
                                            {FIELD_MAPPING.map((field) => (
                                                columnMapping[field.key] !== undefined &&
                                                <TableCell key={field.key}>{field.display}</TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {processedPreviewData.map((student, index) => {
                                            if (!student._isValid) return null;

                                            const isStudentSelected = selectedStudentsForImport.some(s => s.nisn === student.nisn);

                                            return (
                                                <TableRow key={index}>
                                                    <TableCell padding="checkbox">
                                                        <Checkbox
                                                            checked={isStudentSelected}
                                                            onChange={() => handleToggleSelect(student)}
                                                        />
                                                    </TableCell>
                                                    {FIELD_MAPPING.map((field) => (
                                                        columnMapping[field.key] !== undefined &&
                                                        <TableCell key={field.key}>
                                                            {student[field.key]}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <Typography variant="body2" color="text.secondary" mt={2}>
                                {selectedStudentsForImport.length} siswa siap diimpor.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseUploadDialog} color="secondary">
                        Batal
                    </Button>
                    {currentStep === 1 && (
                        <Button onClick={handleConfirmMapping} variant="contained" disabled={isUploading || rawExcelDataRows.length === 0 || Object.keys(columnMapping).length === 0}>
                            {isUploading ? <CircularProgress size={24} /> : 'Lanjutkan ke Pratinjau'}
                        </Button>
                    )}
                    {currentStep === 2 && (
                        <>
                            <Button onClick={() => setCurrentStep(1)} variant="outlined">
                                Kembali ke Pemetaan
                            </Button>
                            <Button onClick={handleImportSelectedStudents} variant="contained" disabled={isUploading || selectedStudentsForImport.length === 0}>
                                {isUploading ? <CircularProgress size={24} /> : `Impor ${selectedStudentsForImport.length} Siswa`}
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Dialog Konfirmasi Hapus Massal */}
            <Dialog
                open={openBulkDeleteConfirmDialog}
                onClose={handleCloseBulkDeleteConfirmDialog}
                aria-labelledby="bulk-delete-dialog-title"
                aria-describedby="bulk-delete-dialog-description"
            >
                <DialogTitle id="bulk-delete-dialog-title">Konfirmasi Hapus Siswa</DialogTitle>
                <DialogContent>
                    <Typography id="bulk-delete-dialog-description">
                        Anda akan menghapus {selectedStudentIds.length} siswa terpilih secara permanen. Aksi ini tidak dapat dibatalkan. Apakah Anda yakin?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseBulkDeleteConfirmDialog} color="secondary">Batal</Button>
                    <Button onClick={handleConfirmBulkDelete} color="error" variant="contained" autoFocus disabled={isLoading}>
                        {isLoading ? <CircularProgress size={24} /> : 'Hapus Sekarang'}
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

export default StudentManagementPage;