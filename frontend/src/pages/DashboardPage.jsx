// frontend/src/pages/DashboardPage.jsx

import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Container,
    Avatar,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    TextField,
    InputAdornment,
    IconButton,
    Button,
    useMediaQuery,
    useTheme,
    CircularProgress
} from '@mui/material';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';

// Import semua ikon yang digunakan
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import FavoriteIcon from '@mui/icons-material/Favorite'; // Used for Penilaian
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import UpgradeIcon from '@mui/icons-material/Upgrade';
import PermIdentityIcon from '@mui/icons-material/PermIdentity';
import SchoolIcon from '@mui/icons-material/School';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import QuizIcon from '@mui/icons-material/Quiz';
import DescriptionIcon from '@mui/icons-material/Description';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import PeopleIcon from '@mui/icons-material/People';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'; // Untuk Buat Ujian
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Import AutoFixHighIcon
// NEW: Import LibraryBooksIcon
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; // <--- TAMBAHKAN BARIS INI

import { isAuthenticated } from '../api/authService';
// Import fungsi baru untuk total siswa, dan juga getKelas
import { getKelas, getSiswaTotalCount } from '../api/classroomService';
import { getAllRpps, getAllSoal } from '../api/aiService';

// Fungsi helper untuk mendapatkan data pengguna dari localStorage
const getUserData = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

function DashboardPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const user = getUserData();

    // State untuk data statistik
    const [stats, setStats] = useState({
        totalClasses: 0,
        totalStudents: 0,
        totalRpps: 0,
        totalQuizzes: 0,
        latestRpps: [],
        latestQuizzes: []
    });
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setIsLoadingStats(true);
            try {
                // Fetch total classes
                const kelasData = await getKelas();
                const totalClasses = kelasData.length;
                
                // Fetch total students using the new endpoint
                const studentsCountResponse = await getSiswaTotalCount(); // Panggil fungsi baru
                const totalStudents = studentsCountResponse.total_students;

                // Fetch data RPP
                const rppsData = await getAllRpps();
                const totalRpps = rppsData.length;
                const latestRpps = rppsData
                    .filter(rpp => rpp.tanggal_dibuat)
                    .sort((a, b) => new Date(b.tanggal_dibuat).getTime() - new Date(a.tanggal_dibuat).getTime())
                    .slice(0, 3);

                // Fetch data Soal
                const soalData = await getAllSoal();
                const totalQuizzes = soalData.length;
                const latestQuizzes = soalData
                    .filter(soal => soal.tanggal_dibuat)
                    .sort((a, b) => new Date(b.tanggal_dibuat).getTime() - new Date(a.tanggal_dibuat).getTime())
                    .slice(0, 3);

                setStats({
                    totalClasses,
                    totalStudents, // Gunakan data dari endpoint baru
                    totalRpps,
                    totalQuizzes,
                    latestRpps,
                    latestQuizzes
                });
            } catch (error) {
                console.error("Gagal memuat data dashboard:", error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        if (isAuthenticated()) {
            fetchDashboardData();
        }
    }, []);

    // Menu item untuk sidebar, disesuaikan dengan navigasi yang baru
    const sidebarMenuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Manajemen Kelas', icon: <SchoolIcon />, path: '/kelas' },
        {
            text: 'RPP', icon: <DescriptionIcon />, subItems: [
                { text: 'Generator RPP', icon: <AutoFixHighIcon />, path: '/generator-rpp' },
                { text: 'Perpustakaan RPP', icon: <AutoStoriesIcon />, path: '/perpustakaan-rpp' },
            ]
        },
        {
            text: 'Soal', icon: <QuestionAnswerIcon />, subItems: [
                { text: 'Generator Soal', icon: <QuizIcon />, path: '/generator-soal' },
                { text: 'Bank Soal', icon: <FolderIcon />, path: '/bank-soal' },
                { text: 'Buat Ujian', icon: <InsertDriveFileIcon />, path: '/exam-generator' },
                // NEW: Tambahkan Bank Ujian Tersimpan
                { text: 'Bank Ujian Tersimpan', icon: <LibraryBooksIcon />, path: '/bank-ujian' }, // <--- TAMBAHKAN BARIS INI
            ]
        },
        { text: 'Penilaian', icon: <FavoriteIcon />, path: '/penilaian' },
        { text: 'Manajemen User', icon: <PeopleIcon />, path: '/admin/dashboard', adminOnly: true },
    ];

    const renderMenuItems = (items) => (
        <List sx={{ width: '100%' }}>
            {items.map((item, index) => {
                if (item.adminOnly && user?.role !== 'Admin' && user?.role !== 'Super User') {
                    return null;
                }

                if (item.subItems) {
                    return (
                        <React.Fragment key={index}>
                            <ListItem>
                                <ListItemIcon sx={{ minWidth: '40px' }}>{item.icon}</ListItemIcon>
                                <ListItemText primary={<Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.text}</Typography>} />
                            </ListItem>
                            <List component="div" disablePadding sx={{ pl: 2 }}>
                                {item.subItems.map((subItem, subIndex) => (
                                    <ListItem
                                        key={subIndex}
                                        button
                                        onClick={() => navigate(subItem.path)}
                                        sx={{ pl: 4, py: 0.5, borderRadius: '8px', '&.Mui-selected': { backgroundColor: theme.palette.action.selected } }}
                                        selected={location.pathname === subItem.path}
                                    >
                                        <ListItemIcon sx={{ minWidth: '40px' }}>{subItem.icon}</ListItemIcon>
                                        <ListItemText primary={<Typography variant="body2">{subItem.text}</Typography>} />
                                    </ListItem>
                                ))}
                            </List>
                        </React.Fragment>
                    );
                } else {
                    return (
                        <ListItem
                            key={index}
                            button
                            onClick={() => navigate(item.path)}
                            sx={{ py: 0.5, borderRadius: '8px', '&.Mui-selected': { backgroundColor: theme.palette.action.selected } }}
                            selected={location.pathname === item.path}
                        >
                            <ListItemIcon sx={{ minWidth: '40px' }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={<Typography variant="body2">{item.text}</Typography>} />
                        </ListItem>
                    );
                }
            })}
        </List>
    );

    return (
        <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
            {/* Sidebar */}
            <Paper
                elevation={3}
                sx={{
                    width: isMobile ? '100%' : '280px',
                    minWidth: '250px',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: 'background.paper',
                    borderRadius: isMobile ? 0 : '12px',
                    mr: isMobile ? 0 : 3,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    overflowY: 'auto',
                }}
            >
                <Box sx={{ my: 2, textAlign: 'center' }}>
                    <Avatar sx={{ width: 80, height: 80, mb: 1, bgcolor: 'primary.main', mx: 'auto' }}>
                        <PermIdentityIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {user ? user.nama_lengkap : 'Guru AI'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {user ? user.role : 'Guest'}
                    </Typography>
                </Box>
                <Divider sx={{ my: 2, width: '80%' }} />
                {renderMenuItems(sidebarMenuItems)}
                <Divider sx={{ my: 2, width: '80%' }} />
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ mt: 2, width: '80%', py: 1.5, borderRadius: '12px' }}
                    onClick={() => navigate('/generator-rpp')}
                >
                    Buat RPP Baru
                </Button>
            </Paper>

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    bgcolor: 'background.default',
                    borderRadius: '12px',
                    overflowY: 'auto',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}
            >
                {/* Top Bar for Overview */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, pb: 2, borderBottom: '1px solid #eee' }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        Overview
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                            variant="outlined"
                            size="small"
                            placeholder="Cari sesuatu..."
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                style: { borderRadius: '10px' }
                            }}
                            sx={{ width: '250px' }}
                        />
                        <IconButton color="inherit">
                            <NotificationsNoneIcon />
                        </IconButton>
                        <Button variant="contained" startIcon={<UpgradeIcon />} sx={{ borderRadius: '8px' }}>
                            Upgrade Plan
                        </Button>
                    </Box>
                </Box>

                {isLoadingStats ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100% - 100px)' }}>
                        <CircularProgress />
                        <Typography variant="h6" color="text.secondary" sx={{ ml: 2 }}>Memuat data dashboard...</Typography>
                    </Box>
                ) : (
                    <Grid container spacing={3}>
                        {/* Summary Cards */}
                        <Grid item xs={12} md={4}>
                            <Paper elevation={2} sx={{ p: 3, borderRadius: '12px', height: '100%', bgcolor: '#e0f2f1' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.dark' }}>
                                    Total Kelas
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                    {stats.totalClasses}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Jumlah kelas yang Anda kelola
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper elevation={2} sx={{ p: 3, borderRadius: '12px', height: '100%', bgcolor: '#e8f5e9' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: 'success.dark' }}>
                                    Total Siswa
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                    {stats.totalStudents}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Jumlah siswa terdaftar
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Paper elevation={2} sx={{ p: 3, borderRadius: '12px', height: '100%', bgcolor: '#ffe0b2' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, color: 'warning.dark' }}>
                                    RPP & Soal
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                                    {stats.totalRpps} <Typography component="span" variant="h6" color="text.secondary">RPP</Typography>
                                </Typography>
                                <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'warning.main', mt: 1 }}>
                                    {stats.totalQuizzes} <Typography component="span" variant="h6" color="text.secondary">Soal</Typography>
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Materi pembelajaran Anda
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* Recent Activity Card */}
                        <Grid item xs={12}>
                            <Paper elevation={2} sx={{ p: 3, borderRadius: '12px' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                        Aktivitas Terbaru
                                    </Typography>
                                    <Button size="small" component={RouterLink} to="/perpustakaan-rpp">Lihat Semua <ArrowForwardIosIcon sx={{ fontSize: 14, ml: 0.5 }} /></Button>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                {stats.latestRpps.length === 0 && stats.latestQuizzes.length === 0 ? (
                                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                                        Belum ada aktivitas terbaru. Mulai buat RPP atau Soal!
                                    </Typography>
                                ) : (
                                    <List>
                                        {stats.latestRpps.map((rpp) => (
                                            <ListItem key={`rpp-${rpp.id}`} secondaryAction={
                                                <Typography variant="caption" color="text.secondary">
                                                    {rpp.tanggal_dibuat}
                                                </Typography>
                                            }>
                                                <ListItemIcon>
                                                    <DescriptionIcon color="primary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <RouterLink to={`/rpp/${rpp.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>RPP: {rpp.judul}</Typography>
                                                        </RouterLink>
                                                    }
                                                    secondary={`Dibuat untuk kelas ${rpp.nama_kelas || 'N/A'}`}
                                                />
                                            </ListItem>
                                        ))}
                                        {stats.latestQuizzes.map((soal) => (
                                            <ListItem key={`soal-${soal.id}`} secondaryAction={
                                                <Typography variant="caption" color="text.secondary">
                                                    {soal.tanggal_dibuat}
                                                </Typography>
                                            }>
                                                <ListItemIcon>
                                                    <QuestionAnswerIcon color="secondary" />
                                                </ListItemIcon>
                                                <ListItemText
                                                    primary={
                                                        <RouterLink to={`/soal/${soal.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Soal: {soal.judul}</Typography>
                                                        </RouterLink>
                                                    }
                                                    secondary={`Berdasarkan RPP: ${soal.judul_rpp || 'N/A'}`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </Box>
        </Box>
    );
}

export default DashboardPage;