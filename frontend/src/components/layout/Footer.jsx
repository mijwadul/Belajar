// frontend/src/components/layout/Footer.jsx

import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        py: 3, // Padding atas dan bawah
        px: 2, // Padding kiri dan kanan
        mt: 'auto', // Mendorong footer ke bagian bawah halaman
        backgroundColor: (theme) =>
          theme.palette.mode === 'light'
            ? theme.palette.grey[200]
            : theme.palette.grey[800],
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          {'Mijwadul Ihsas © '}
          <Link color="inherit" href="https://mui.com/"> 
            SinerGi-AI
          </Link>{' '}
          {new Date().getFullYear()}
          {'.'}
        </Typography>
      </Container>
    </Box>
  );
}

export default Footer;