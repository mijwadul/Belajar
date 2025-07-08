// frontend/src/components/auth/RoleBasedProtectedRoute.jsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const getUserRole = () => {
  const user = localStorage.getItem('user');
  if (user) {
    return JSON.parse(user).role;
  }
  return null;
};

const RoleBasedProtectedRoute = ({ allowedRoles }) => {
  const userRole = getUserRole();

  // Jika peran pengguna ada di dalam daftar peran yang diizinkan,
  // tampilkan halaman yang diminta.
  // Jika tidak, alihkan ke halaman yang tidak diizinkan (atau halaman utama).
  return allowedRoles.includes(userRole) ? <Outlet /> : <Navigate to="/kelas" replace />;
};

export default RoleBasedProtectedRoute;