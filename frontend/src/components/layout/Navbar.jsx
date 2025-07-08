// frontend/src/components/layout/Navbar.jsx

import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser, isAuthenticated } from '../../api/authService';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import logo from '../../assets/logo.png';

function Navbar() {
  const [isAuth, setIsAuth] = useState(isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation(); // Hook untuk mendeteksi perubahan URL

  useEffect(() => {
    setIsAuth(isAuthenticated());
  }, [location]); 

  const handleLogout = () => {
    logoutUser(); // Hapus token dari localStorage
    setIsAuth(false); // Update state
    navigate('/login'); // Arahkan ke halaman login
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Box 
          component={RouterLink} 
          to={isAuth ? "/kelas" : "/"} 
          sx={{ flexGrow: 1 }}
        >
          <img src={logo} alt="SinerGi-AI Logo" style={{ height: '40px', verticalAlign: 'middle' }} />
        </Box>

        {isAuth ? (
          // --- Tampilan jika SUDAH LOGIN ---
          <>
            <Button color="inherit" component={RouterLink} to="/kelas">Manajemen Kelas</Button>
            <Button color="inherit" component={RouterLink} to="/generator-rpp">Generator RPP</Button>
            <Button color="inherit" component={RouterLink} to="/perpustakaan-rpp">Perpustakaan RPP</Button>
            <Button color="inherit" component={RouterLink} to="/generator-soal">Generator Soal</Button>
            <Button color="inherit" component={RouterLink} to="/bank-soal">Bank Soal</Button>
            {/* Tambahkan link lain yang relevan di sini */}
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </>
        ) : (
          // --- Tampilan jika BELUM LOGIN ---
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