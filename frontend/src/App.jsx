// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Box, Typography } from '@mui/material'; // Tambah Typography

// Import Tema dan Komponen Layout
import theme from './theme';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedProtectedRoute from './components/auth/RoleBasedProtectedRoute';

// Import Semua Halaman
import UserManagementPage from './pages/admin/UserManagementPage';
import EditUserPage from './pages/admin/EditUserPage'; // Pastikan Anda memiliki file ini
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ClassListPage from './pages/ClassListPage';
import StudentManagementPage from './pages/StudentManagementPage';
import AttendancePage from './pages/AttendancePage';
import RppGeneratorPage from './pages/RppGeneratorPage';
import RppLibraryPage from './pages/RppLibraryPage';
import RppDetailPage from './pages/RppDetailPage';
import QuizGeneratorPage from './pages/QuizGeneratorPage';
import BankSoalPage from './pages/BankSoalPage';
import SoalDetailPage from './pages/SoalDetailPage';

// Placeholder untuk halaman Admin, jika belum ada komponen sebenarnya
const AdminDashboard = () => <Typography variant="h4">Admin Dashboard (Coming Soon)</Typography>;


function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        {/* Box utama untuk layout flexbox agar footer menempel di bawah */}
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <CssBaseline />
          <Navbar />
          
          {/* Container utama untuk konten halaman */}
          <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
            <Routes>
              {/* === Rute Publik (Bisa diakses semua orang) === */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* === Rute Terproteksi (Hanya untuk yang sudah login) === */}
              <Route element={<ProtectedRoute />}>
                {/* Rute untuk semua peran yang sudah login (Guru, Admin, dll.) */}
                <Route path="/kelas" element={<ClassListPage />} />
                {/* PERBAIKAN: Rute /kelas/:id sekarang langsung ke StudentManagementPage */}
                <Route path="/kelas/:id" element={<StudentManagementPage />} /> 
                <Route path="/kelas/:id/absensi" element={<AttendancePage />} /> {/* Rute Absensi tetap konsisten */}
                
                <Route path="/generator-rpp" element={<RppGeneratorPage />} />
                <Route path="/perpustakaan-rpp" element={<RppLibraryPage />} />
                <Route path="/rpp/:id" element={<RppDetailPage />} />
                <Route path="/generator-soal" element={<QuizGeneratorPage />} />
                <Route path="/bank-soal" element={<BankSoalPage />} />
                <Route path="/soal/:id" element={<SoalDetailPage />} />

                {/* Rute Admin (dilindungi peran) */}
                <Route element={<RoleBasedProtectedRoute allowedRoles={['Admin', 'Super User']} />}>
                  {/* Rute /admin/dashboard akan mengarah ke UserManagementPage */}
                  <Route path="/admin/dashboard" element={<UserManagementPage />} />
                  {/* Rute untuk mengedit user */}
                  <Route path="/admin/users/:id" element={<EditUserPage />} /> 
                </Route>
              </Route>

              {/* Rute fallback untuk halaman tidak ditemukan */}
              <Route path="*" element={<Typography variant="h4" sx={{ textAlign: 'center', mt: 5 }}>404 - Halaman Tidak Ditemukan</Typography>} />
            </Routes>
          </Container>
          
          <Footer />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;