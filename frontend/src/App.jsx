// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Box } from '@mui/material';

// Import Tema dan Komponen Layout
import theme from './theme';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';

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
                <Route path="/kelas" element={<ClassListPage />} />
                <Route path="/kelas/:id/siswa" element={<StudentManagementPage />} />
                <Route path="/kelas/:id/absensi" element={<AttendancePage />} />
                <Route path="/generator-rpp" element={<RppGeneratorPage />} />
                <Route path="/perpustakaan-rpp" element={<RppLibraryPage />} />
                <Route path="/rpp/:id" element={<RppDetailPage />} />
                <Route path="/generator-soal" element={<QuizGeneratorPage />} />
                <Route path="/bank-soal" element={<BankSoalPage />} />
                <Route path="/soal/:id" element={<SoalDetailPage />} />
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