// frontend/src/components/auth/ProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const useAuth = () => {
  // Cek apakah ada token di localStorage dengan nama yang benar
  const token = localStorage.getItem('access_token'); // <-- PERBAIKAN DI SINI
  return !!token; // Mengembalikan true jika token ada, false jika tidak
};

const ProtectedRoute = () => {
  const isAuth = useAuth();

  // Jika pengguna sudah login, tampilkan konten halaman yang diminta (melalui <Outlet />)
  // Jika tidak, alihkan ke halaman login
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;