// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import ClassListPage from './pages/ClassListPage';
import RppGeneratorPage from './pages/RppGeneratorPage';
import StudentManagementPage from './pages/StudentManagementPage';
import AttendancePage from './pages/AttendancePage';
import QuizGeneratorPage from './pages/QuizGeneratorPage'; // Impor halaman baru
import RppLibraryPage from './pages/RppLibraryPage'; 
import RppDetailPage from './pages/RppDetailPage';
import BankSoalPage from './pages/BankSoalPage';
import SoalDetailPage from './pages/SoalDetailPage'; 

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<ClassListPage />} />
            <Route path="/generator-rpp" element={<RppGeneratorPage />} />
            <Route path="/kelas/:id/siswa" element={<StudentManagementPage />} />
            <Route path="/kelas/:id/absensi" element={<AttendancePage />} />
            <Route path="/perpustakaan-rpp" element={<RppLibraryPage />} />
            <Route path="/rpp/:id" element={<RppDetailPage />} />
            <Route path="/generator-soal" element={<QuizGeneratorPage />} />
            <Route path="/bank-soal" element={<BankSoalPage />} />
            <Route path="/soal/:id" element={<SoalDetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;