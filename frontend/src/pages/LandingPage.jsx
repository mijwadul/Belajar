// frontend/src/pages/LandingPage.jsx

import React from 'react';
import { Typography, Box, Button, Container, Grid, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import QuizIcon from '@mui/icons-material/Quiz';
import logo from '../assets/logo.png';

const features = [
  {
    icon: <AutoStoriesIcon sx={{ fontSize: 40 }} color="primary" />,
    title: 'Generator RPP Cerdas',
    description: 'Buat Rencana Pelaksanaan Pembelajaran (RPP) yang lengkap dan sesuai kurikulum dalam hitungan menit dengan bantuan AI.',
  },
  {
    icon: <PeopleAltIcon sx={{ fontSize: 40 }} color="primary" />,
    title: 'Manajemen Kelas & Siswa',
    description: 'Kelola semua kelas dan data siswa Anda di satu tempat yang terorganisir, termasuk rekap absensi yang mudah diunduh.',
  },
  {
    icon: <QuizIcon sx={{ fontSize: 40 }} color="primary" />,
    title: 'Bank Soal Otomatis',
    description: 'Hasilkan beragam soal pilihan ganda atau esai berdasarkan materi ajar Anda untuk keperluan ulangan dan tugas.',
  },
];

function LandingPage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* === HERO SECTION === */}
      <Box sx={{ textAlign: 'center', my: 10 }}>
        {/* Tempat untuk Logo Anda */}
        {/* <img src={logo} alt="SinerGi-AI Logo" style={{ width: '150px', marginBottom: '16px' }} /> */}
        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Selamat Datang di SinerGi-AI
        </Typography>
        <Typography variant="h5" color="text.secondary" paragraph maxWidth="md" mx="auto">
          Platform cerdas yang menyatukan manajemen kelas dan kekuatan AI untuk meringankan beban kerja dan meningkatkan kualitas pengajaran Anda.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button component={RouterLink} to="/register" variant="contained" size="large" sx={{ mr: 2, px: 4, py: 1.5 }}>
            Mulai Gratis
          </Button>
          <Button component={RouterLink} to="/login" variant="outlined" size="large" sx={{ px: 4, py: 1.5 }}>
            Masuk
          </Button>
        </Box>
      </Box>

      {/* === FEATURES SECTION === */}
      <Box sx={{ my: 10 }}>
        <Typography variant="h4" component="h2" gutterBottom align="center" sx={{ fontWeight: '600', mb: 6 }}>
          Fitur Unggulan Kami
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {features.map((feature) => (
            <Grid item key={feature.title} xs={12} sm={6} md={4}>
              <Paper elevation={3} sx={{ p: 4, textAlign: 'center', height: '100%' }}>
                {feature.icon}
                <Typography variant="h6" component="h3" sx={{ mt: 2, mb: 1, fontWeight: '600' }}>
                  {feature.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}

export default LandingPage;