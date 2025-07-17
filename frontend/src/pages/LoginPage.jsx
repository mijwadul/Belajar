// frontend/src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { loginUser } from '../api/authService';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Link
} from '@mui/material';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const controls = useAnimation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Email dan password harus diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginUser(formData);
      // Jika login berhasil, arahkan ke halaman utama aplikasi (dashboard kelas)
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Book flip animation variant
  const bookFlip = {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1, transition: { duration: 0.8, ease: [0.6, 0.01, 0.4, 0.99] } },
    exit: { rotateY: -90, opacity: 0, transition: { duration: 0.6 } }
  };

  // Gesture handler (swipe left/right to navigate)
  const handleDragEnd = (event, info) => {
    if (info.offset.x < -100) {
      // Swipe left: ke halaman register
      navigate('/register');
    } else if (info.offset.x > 100) {
      // Swipe right: ke landing/dashboard
      navigate('/dashboard');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        variants={bookFlip}
        initial="initial"
        animate="animate"
        exit="exit"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ perspective: 1200 }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 4,
            background: 'linear-gradient(135deg, #e3f0ff 0%, #f9f9f9 100%)',
            borderRadius: 4,
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 2 }}>
            Masuk ke Akun Anda
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Alamat Email"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              sx={{ background: '#fff', borderRadius: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              sx={{ background: '#fff', borderRadius: 2 }}
            />

            {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 600, fontSize: '1.1rem', letterSpacing: 1 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Masuk'}
            </Button>
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Link component={RouterLink} to="/register" variant="body2" sx={{ color: 'secondary.main', fontWeight: 500 }}>
                Belum punya akun? Daftar
              </Link>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ mt: 2, color: 'grey.600' }}>
            Geser ke kiri untuk daftar, ke kanan untuk dashboard
          </Typography>
        </Box>
      </motion.div>
    </Container>
  );
}

export default LoginPage;