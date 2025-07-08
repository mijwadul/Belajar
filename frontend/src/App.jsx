// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Box, Typography } from '@mui/material';

// Import Tema dan Komponen Layout
import theme from './theme';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedProtectedRoute from './components/auth/RoleBasedProtectedRoute';

// Import Semua Halaman
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

// Placeholder untuk halaman Admin
const AdminDashboard = () => <Typography variant="h4">Admin Dashboard</Typography>;

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
                <Route path="/kelas/:id/siswa" element={<StudentManagementPage />} />
                <Route path="/kelas/:id/absensi" element={<AttendancePage />} />
                <Route path="/generator-rpp" element={<RppGeneratorPage />} />
                <Route path="/perpustakaan-rpp" element={<RppLibraryPage />} />
                <Route path="/rpp/:id" element={<RppDetailPage />} />
                <Route path="/generator-soal" element={<QuizGeneratorPage />} />
                <Route path="/bank-soal" element={<BankSoalPage />} />
                <Route path="/soal/:id" element={<SoalDetailPage />} />

                {/* --- Rute KHUSUS ADMIN & SUPER USER --- */}
                <Route element={<RoleBasedProtectedRoute allowedRoles={['Admin', 'Super User']} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  {/* Tambahkan rute admin lainnya di sini jika ada */}
                </Route>
              </Route>
            </Routes>
          </Container>
          
          <Footer />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;