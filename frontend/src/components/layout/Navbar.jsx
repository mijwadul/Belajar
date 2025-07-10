// frontend/src/components/layout/Navbar.jsx

import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser, isAuthenticated } from '../../api/authService';
import {
    AppBar,
    Toolbar,
    Button,
    Box,
    IconButton,
    Menu,
    MenuItem,
    useMediaQuery,
    useTheme,
    Typography,
    ListItemIcon, // Tambahkan ini untuk ikon di MenuItem
    ListItemText // Tambahkan ini untuk teks di MenuItem
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Import ikon Material-UI
import DashboardIcon from '@mui/icons-material/Dashboard'; // Untuk Dashboard
import SchoolIcon from '@mui/icons-material/School'; // Untuk Manajemen Kelas
import DescriptionIcon from '@mui/icons-material/Description'; // Untuk grup RPP
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'; // Untuk Generator RPP
import AutoStoriesIcon from '@mui/icons-material/AutoStories'; // Untuk Perpustakaan RPP
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'; // Untuk grup Soal
import QuizIcon from '@mui/icons-material/Quiz'; // Untuk Generator Soal
import StorageIcon from '@mui/icons-material/Storage'; // Untuk Bank Soal
import PostAddIcon from '@mui/icons-material/PostAdd'; // Untuk Buat Ujian
import AssessmentIcon from '@mui/icons-material/Assessment'; // Untuk Penilaian
import PeopleIcon from '@mui/icons-material/People'; // Untuk Manajemen User
import LogoutIcon from '@mui/icons-material/Logout'; // Untuk Logout
// NEW: Import LibraryBooksIcon untuk Bank Ujian Tersimpan
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; // <--- TAMBAHKAN BARIS INI

// Pastikan Anda sudah menempatkan logo di folder 'src/assets/'
import logo from '../../assets/logo.png';

function Navbar() {
    const [isAuth, setIsAuth] = useState(isAuthenticated());
    const [userRole, setUserRole] = useState(null);
    const [anchorElMobile, setAnchorElMobile] = useState(null); // State untuk mengontrol menu mobile
    const [anchorElRpp, setAnchorElRpp] = useState(null); // State untuk menu RPP desktop
    const [anchorElSoal, setAnchorElSoal] = useState(null); // State untuk menu Soal desktop

    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    useEffect(() => {
        const checkAuth = () => {
            const authStatus = isAuthenticated();
            setIsAuth(authStatus);
            if (authStatus) {
                const user = JSON.parse(localStorage.getItem('user'));
                setUserRole(user ? user.role : null);
            } else {
                setUserRole(null);
            }
        };
        checkAuth();
    }, [location]);

    // Handlers untuk menu mobile
    const handleMobileMenuOpen = (event) => {
        setAnchorElMobile(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setAnchorElMobile(null);
    };

    // Handlers untuk menu RPP desktop
    const handleRppMenuOpen = (event) => {
        setAnchorElRpp(event.currentTarget);
    };

    const handleRppMenuClose = () => {
        setAnchorElRpp(null);
    };

    // Handlers untuk menu Soal desktop
    const handleSoalMenuOpen = (event) => {
        setAnchorElSoal(event.currentTarget);
    };

    const handleSoalMenuClose = () => {
        setAnchorElSoal(null);
    };

    const handleLogout = () => {
        handleMobileMenuClose(); // Tutup menu mobile jika terbuka
        handleRppMenuClose(); // Tutup menu RPP jika terbuka
        handleSoalMenuClose(); // Tutup menu Soal jika terbuka
        logoutUser();
        setIsAuth(false);
        setUserRole(null);
        navigate('/login');
    };

    const handleMenuClick = (path) => {
        handleMobileMenuClose(); // Tutup menu mobile
        handleRppMenuClose(); // Tutup menu RPP
        handleSoalMenuClose(); // Tutup menu Soal
        navigate(path);
    };

    // Komponen untuk menu versi desktop
    const renderDesktopMenu = () => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button color="inherit" component={RouterLink} to="/dashboard" startIcon={<DashboardIcon />}>Dashboard</Button>
            <Button color="inherit" component={RouterLink} to="/kelas" startIcon={<SchoolIcon />}>Manajemen Kelas</Button>

            {/* Menu RPP Dropdown */}
            <Button
                color="inherit"
                onClick={handleRppMenuOpen}
                startIcon={<DescriptionIcon />}
            >
                RPP
            </Button>
            <Menu
                anchorEl={anchorElRpp}
                open={Boolean(anchorElRpp)}
                onClose={handleRppMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'rpp-menu-button',
                }}
            >
                <MenuItem onClick={() => handleMenuClick('/generator-rpp')}>
                    <ListItemIcon><AutoFixHighIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Generator RPP</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/perpustakaan-rpp')}>
                    <ListItemIcon><AutoStoriesIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Perpustakaan RPP</ListItemText>
                </MenuItem>
            </Menu>

            {/* Menu Soal Dropdown */}
            <Button
                color="inherit"
                onClick={handleSoalMenuOpen}
                startIcon={<QuestionAnswerIcon />}
            >
                Soal
            </Button>
            <Menu
                anchorEl={anchorElSoal}
                open={Boolean(anchorElSoal)}
                onClose={handleSoalMenuClose}
                MenuListProps={{
                    'aria-labelledby': 'soal-menu-button',
                }}
            >
                <MenuItem onClick={() => handleMenuClick('/generator-soal')}>
                    <ListItemIcon><QuizIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Generator Soal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/bank-soal')}>
                    <ListItemIcon><StorageIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Bank Soal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/exam-generator')}>
                    <ListItemIcon><PostAddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Buat Ujian</ListItemText>
                </MenuItem>
                {/* NEW: Menu item untuk Bank Ujian Tersimpan */}
                <MenuItem onClick={() => handleMenuClick('/bank-ujian')}> {/* <--- TAMBAHKAN BARIS INI */}
                    <ListItemIcon><LibraryBooksIcon fontSize="small" /></ListItemIcon> {/* <--- TAMBAHKAN BARIS INI */}
                    <ListItemText>Bank Ujian Tersimpan</ListItemText> {/* <--- TAMBAHKAN BARIS INI */}
                </MenuItem>
            </Menu>

            <Button color="inherit" component={RouterLink} to="/penilaian" startIcon={<AssessmentIcon />}>Penilaian</Button>

            {/* Tampilkan tombol Manajemen User hanya untuk Admin atau Super User */}
            {(userRole === 'Admin' || userRole === 'Super User') && (
                <Button color="inherit" component={RouterLink} to="/admin/dashboard" startIcon={<PeopleIcon />}>Manajemen User</Button>
            )}

            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>Logout</Button>
        </Box>
    );

    // Komponen untuk menu versi mobile (hamburger)
    const renderMobileMenu = () => (
        <>
            <IconButton size="large" edge="end" color="inherit" aria-label="menu" onClick={handleMobileMenuOpen}>
                <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchorElMobile} open={Boolean(anchorElMobile)} onClose={handleMobileMenuClose}>
                <MenuItem onClick={() => handleMenuClick('/dashboard')}>
                    <ListItemIcon><DashboardIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Dashboard</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/kelas')}>
                    <ListItemIcon><SchoolIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Manajemen Kelas</ListItemText>
                </MenuItem>

                {/* RPP Grouping Mobile */}
                <MenuItem>
                    <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>RPP</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/generator-rpp')} sx={{ pl: 4 }}>
                    <ListItemIcon><AutoFixHighIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Generator RPP</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/perpustakaan-rpp')} sx={{ pl: 4 }}>
                    <ListItemIcon><AutoStoriesIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Perpustakaan RPP</ListItemText>
                </MenuItem>

                {/* Soal Grouping Mobile */}
                <MenuItem>
                    <ListItemIcon><QuestionAnswerIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Soal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/generator-soal')} sx={{ pl: 4 }}>
                    <ListItemIcon><QuizIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Generator Soal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/bank-soal')} sx={{ pl: 4 }}>
                    <ListItemIcon><StorageIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Bank Soal</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => handleMenuClick('/exam-generator')} sx={{ pl: 4 }}>
                    <ListItemIcon><PostAddIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Buat Ujian</ListItemText>
                </MenuItem>
                {/* NEW: Menu item untuk Bank Ujian Tersimpan (mobile) */}
                <MenuItem onClick={() => handleMenuClick('/bank-ujian')} sx={{ pl: 4 }}> {/* <--- TAMBAHKAN BARIS INI */}
                    <ListItemIcon><LibraryBooksIcon fontSize="small" /></ListItemIcon> {/* <--- TAMBAHKAN BARIS INI */}
                    <ListItemText>Bank Ujian Tersimpan</ListItemText> {/* <--- TAMBAHKAN BARIS INI */}
                </MenuItem>

                <MenuItem onClick={() => handleMenuClick('/penilaian')}>
                    <ListItemIcon><AssessmentIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Penilaian</ListItemText>
                </MenuItem>

                {/* Tampilkan menu item Manajemen User hanya untuk Admin atau Super User */}
                {(userRole === 'Admin' || userRole === 'Super User') && (
                    <MenuItem onClick={() => handleMenuClick('/admin/dashboard')}>
                        <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
                        <ListItemText>Manajemen User</ListItemText>
                    </MenuItem>
                )}

                <MenuItem onClick={handleLogout}>
                    <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                </MenuItem>
            </Menu>
        </>
    );

    return (
        <AppBar position="sticky" color="primary">
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Box component={RouterLink} to={isAuth ? "/dashboard" : "/"}> {/* Ubah rute default setelah login ke /dashboard */}
                    {logo ? (
                        <img src={logo} alt="SinerGi-AI Logo" style={{ height: '40px', verticalAlign: 'middle' }} />
                    ) : (
                        <Typography variant="h6" component="div">SinerGi-AI</Typography>
                    )}
                </Box>

                {isAuth ? (
                    isMobile ? renderMobileMenu() : renderDesktopMenu()
                ) : (
                    <Box>
                        <Button color="inherit" component={RouterLink} to="/login">Masuk</Button>
                        <Button color="inherit" component={RouterLink} to="/register">Daftar</Button>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
}

export default Navbar;