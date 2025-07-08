// frontend/src/pages/admin/EditUserPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById, updateUser } from '../../api/authService';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';

const EditUserPage = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { id } = useParams(); // Mengambil id dari URL
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getUserById(id);
        setFormData({
          full_name: userData.full_name,
          email: userData.email,
          role: userData.role,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const updateData = { ...formData };
    if (password) {
      updateData.password = password;
    }

    try {
      const result = await updateUser(id, updateData);
      setSuccess(result.message);
      setTimeout(() => {
        navigate('/admin/users'); // Arahkan kembali ke manajemen pengguna
      }, 2000);
    } catch (err) {
      setError(err.message);
    }
  };

  if (isLoading) {
    return <p className="text-center mt-8">Memuat...</p>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Pengguna</h1>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4" role="alert">{success}</div>}
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-lg mx-auto">
          <div className="mb-4">
            <label htmlFor="full_name" className="block text-gray-700 font-bold mb-2">Nama Lengkap</label>
            <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">Email</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 font-bold mb-2">Password Baru</label>
            <input type="password" id="password" name="password" value={password} onChange={handlePasswordChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" placeholder="Kosongkan jika tidak ingin mengubah" />
          </div>
          <div className="mb-6">
            <label htmlFor="role" className="block text-gray-700 font-bold mb-2">Peran</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default EditUserPage;