// frontend/src/pages/LoginPage.jsx

import React, { useState } from 'react';
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

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 3,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        <Typography component="h1" variant="h5">
          Masuk ke Akun Anda
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
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
          />

          {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Masuk'}
          </Button>
          <Box textAlign="center">
            <Link component={RouterLink} to="/register" variant="body2">
              {"Belum punya akun? Daftar"}
            </Link>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default LoginPage;