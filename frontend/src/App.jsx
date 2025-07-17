// frontend/src/App.jsx

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter as Router, Routes, Route, Navigate, Link as RouterLink } from 'react-router-dom'; // Tambah Link as RouterLink
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Container, Box, Typography, Button } from '@mui/material'; // Tambah Button

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
import ExamLibraryPage from './pages/ExamLibraryPage';

// Import komponen baru (DashboardPage)
import DashboardPage from './pages/DashboardPage';

// Import komponen admin dengan path yang benar
import UserManagementPage from './pages/admin/UserManagementPage'; // Path yang benar
import EditUserPage from './pages/admin/EditUserPage'; // Path yang benar
import ExamGeneratorPage from './pages/ExamGeneratorPage';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <CssBaseline />
          <Navbar />
          {/* Animasi transisi seluruh halaman */}
          <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
            <AnimatePresence mode="wait">
              {/* Gunakan motion.div untuk transisi book flip pada halaman */}
              <motion.div
                key={window.location.pathname}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1, transition: { duration: 0.8, ease: [0.6, 0.01, 0.4, 0.99] } }}
                exit={{ rotateY: -90, opacity: 0, transition: { duration: 0.6 } }}
                style={{ perspective: 1200 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(event, info) => {
                  if (info.offset.x < -100) {
                    // Swipe left: ke halaman berikutnya (misal register)
                    if (window.location.pathname === '/login') window.location.href = '/register';
                  } else if (info.offset.x > 100) {
                    // Swipe right: ke dashboard
                    if (window.location.pathname !== '/dashboard') window.location.href = '/dashboard';
                  }
                }}
              >
                <Routes>
                  {/* === Rute Publik (Bisa diakses semua orang) === */}
                  <Route path="/" element={<Navigate to="/login" replace />} /> {/* Redirect root ke login */}
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/login" element={<LoginPage />} />

                  {/* === Rute Terproteksi (Hanya untuk yang sudah login) === */}
                  <Route element={<ProtectedRoute />}>
                    {/* Rute baru untuk Dashboard */}
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Rute untuk semua peran yang sudah login (Guru, Admin, dll.) */}
                    <Route path="/kelas" element={<ClassListPage />} />
                    <Route path="/kelas/:id" element={<StudentManagementPage />} /> 
                    <Route path="/kelas/:id/absensi" element={<AttendancePage />} />
                    <Route path="/generator-rpp" element={<RppGeneratorPage />} />
                    <Route path="/perpustakaan-rpp" element={<RppLibraryPage />} />
                    <Route path="/rpp/:id" element={<RppDetailPage />} />
                    <Route path="/generator-soal" element={<QuizGeneratorPage />} />
                    <Route path="/bank-soal" element={<BankSoalPage />} />
                    <Route path="/soal/:id" element={<SoalDetailPage />} />
                    <Route path="/exam-generator" element={<ExamGeneratorPage />} />
                    <Route path="/bank-ujian" element={<ExamLibraryPage />} />
                    {/* Rute Admin (dilindungi peran) */}
                    <Route element={<RoleBasedProtectedRoute allowedRoles={['Admin', 'Super User']} />}>
                      {/* Rute /admin/dashboard akan mengarah ke UserManagementPage */}
                      <Route path="/admin/dashboard" element={<UserManagementPage />} />
                      <Route path="/admin/users/:id" element={<EditUserPage />} /> 
                    </Route>

                    {/* Rute placeholder untuk halaman Penilaian */}
                    <Route path="/penilaian" element={
                        <Box sx={{ p: 4, textAlign: 'center', mt: 8 }}>
                            <Typography variant="h4" color="text.primary" gutterBottom>
                                Halaman Penilaian
                            </Typography>
                            <Typography variant="h6" color="text.secondary">
                                Fitur ini akan segera hadir!
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                component={RouterLink}
                                to="/dashboard"
                                sx={{ mt: 3 }}
                            >
                                Kembali ke Dashboard
                            </Button>
                        </Box>
                    } />

                  </Route>

                  {/* Rute fallback untuk halaman tidak ditemukan */}
                  <Route path="*" element={
                    <Box sx={{ p: 4, textAlign: 'center', mt: 8 }}>
                        <Typography variant="h4" color="text.primary" gutterBottom>
                            404 - Halaman Tidak Ditemukan
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                            Maaf, halaman yang Anda cari tidak ada.
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            component={RouterLink}
                            to="/dashboard"
                            sx={{ mt: 3 }}
                        >
                            Kembali ke Dashboard
                        </Button>
                    </Box>
                  } />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Container>
          <Footer />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;