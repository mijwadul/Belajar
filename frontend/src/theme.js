// frontend/src/theme.js

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Warna biru yang solid untuk tombol utama, link, dll.
    },
    secondary: {
      main: '#dc004e', // Warna pink/merah untuk aksi sekunder atau aksen
    },
    background: {
      default: '#f4f6f8', // Warna abu-abu sangat terang untuk latar belakang halaman
      paper: '#ffffff',   // Warna putih untuk "kertas" seperti kartu atau form
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600, // Membuat judul H4 sedikit lebih tebal
    },
    h5: {
      fontWeight: 600, // Membuat judul H5 sedikit lebih tebal
    }
  },
  shape: {
    borderRadius: 8, // Memberi sudut yang sedikit lebih membulat pada komponen
  },
});

export default theme;