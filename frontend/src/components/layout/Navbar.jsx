// frontend/src/components/layout/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
    const navStyle = {
        background: '#333',
        color: '#fff',
        padding: '10px',
        marginBottom: '20px'
    };
    const linkStyle = {
        color: '#fff',
        textDecoration: 'none',
        margin: '0 10px'
    };
    return (
        <nav style={navStyle}>
            <Link to="/" style={linkStyle}>Manajemen Kelas</Link>
            <Link to="/generator-rpp" style={linkStyle}>Generator RPP</Link>
            <Link to="/perpustakaan-rpp" style={linkStyle}>Perpustakaan RPP</Link>
            <Link to="/generator-soal" style={linkStyle}>Generator Soal</Link>
            <Link to="/bank-soal" style={linkStyle}>Bank Soal</Link>
        </nav>
    );
}

export default Navbar;