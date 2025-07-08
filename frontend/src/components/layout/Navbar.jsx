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
    Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

// Pastikan Anda sudah menempatkan logo di folder 'src/assets/'
// Jika belum ada logo, baris ini bisa menyebabkan error. Anda bisa memberi komentar dulu.
import logo from '../../assets/logo.png'; 

function Navbar() {
    const [isAuth, setIsAuth] = useState(isAuthenticated());
    const [userRole, setUserRole] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null); // State untuk mengontrol menu mobile

    const navigate = useNavigate();
    const location = useLocation(); // Hook untuk mendeteksi perubahan URL
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // true jika layar 'medium' atau lebih kecil

    // useEffect untuk memperbarui status otentikasi dan peran setiap kali URL berubah
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

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleMenuClose();
        logoutUser();
        setIsAuth(false);
        setUserRole(null);
        navigate('/login');
    };

    const handleMenuClick = (path) => {
        handleMenuClose();
        navigate(path);
    }

    // Komponen untuk menu versi desktop
    const renderDesktopMenu = () => (
        <Box>
            <Button color="inherit" component={RouterLink} to="/kelas">Manajemen Kelas</Button>
            <Button color="inherit" component={RouterLink} to="/generator-rpp">Generator RPP</Button>
            <Button color="inherit" component={RouterLink} to="/perpustakaan-rpp">Perpustakaan RPP</Button>
            <Button color="inherit" component={RouterLink} to="/generator-soal">Generator Soal</Button>
            <Button color="inherit" component={RouterLink} to="/bank-soal">Bank Soal</Button>
            
            {/* Tampilkan tombol Manajemen User hanya untuk Admin atau Super User */}
            {(userRole === 'Admin' || userRole === 'Super User') && (
                <Button color="inherit" component={RouterLink} to="/admin/dashboard">Manajemen User</Button>
            )}

            <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Box>
    );

    // Komponen untuk menu versi mobile (hamburger)
    const renderMobileMenu = () => (
        <>
            <IconButton size="large" edge="end" color="inherit" aria-label="menu" onClick={handleMenuOpen}>
                <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={() => handleMenuClick('/kelas')}>Manajemen Kelas</MenuItem>
                <MenuItem onClick={() => handleMenuClick('/generator-rpp')}>Generator RPP</MenuItem>
                <MenuItem onClick={() => handleMenuClick('/perpustakaan-rpp')}>Perpustakaan RPP</MenuItem>
                <MenuItem onClick={() => handleMenuClick('/generator-soal')}>Generator Soal</MenuItem>
                <MenuItem onClick={() => handleMenuClick('/bank-soal')}>Bank Soal</MenuItem>
                
                {/* Tampilkan menu item Manajemen User hanya untuk Admin atau Super User */}
                {(userRole === 'Admin' || userRole === 'Super User') && (
                    <MenuItem onClick={() => handleMenuClick('/admin/dashboard')}>Manajemen User</MenuItem>
                )}

                <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </Menu>
        </>
    );
    
    return (
        <AppBar position="sticky" color="primary">
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Box component={RouterLink} to={isAuth ? "/kelas" : "/"}>
                    {/* Jika logo ada, tampilkan. Jika tidak, tampilkan teks. */}
                    {logo ? (
                        <img src={logo} alt="SinerGi-AI Logo" style={{ height: '40px', verticalAlign: 'middle' }} />
                    ) : (
                        <Typography variant="h6" component="div">SinerGi-AI</Typography>
                    )}
                </Box>

                {isAuth ? (
                    // Jika sudah login, tampilkan menu sesuai ukuran layar
                    isMobile ? renderMobileMenu() : renderDesktopMenu()
                ) : (
                    // Jika belum login, tampilkan tombol Masuk dan Daftar
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