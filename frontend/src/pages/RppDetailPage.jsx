// frontend/src/pages/RppDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRppById } from '../api/aiService';
import ReactMarkdown from 'react-markdown';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

function RppDetailPage() {
    const { id } = useParams();
    const [rpp, setRpp] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const muatData = async () => {
            try {
                const data = await getRppById(id);
                setRpp(data);
            } catch (error) {
                console.error("Gagal memuat detail RPP:", error);
            } finally {
                setIsLoading(false);
            }
        };
        muatData();
    }, [id]);

    const handleDownload = () => {
        if (!rpp) return;
        // Fungsi download ini sama persis seperti yang ada di RppGeneratorPage sebelumnya
        const paragraphs = rpp.konten_markdown.split('\n').map(line => {
            if (line.startsWith('### ')) return new Paragraph({ children: [new TextRun({ text: line.replace('### ', ''), bold: true, size: 28 })], spacing: { before: 240, after: 120 } });
            if (line.startsWith('## ')) return new Paragraph({ children: [new TextRun({ text: line.replace('## ', ''), bold: true, size: 32 })], spacing: { before: 240, after: 120 } });
            if (line.startsWith('# ')) return new Paragraph({ children: [new TextRun({ text: line.replace('# ', ''), bold: true, size: 36, allCaps: true })], spacing: { before: 240, after: 120 } });
            if (line.startsWith('- ')) return new Paragraph({ children: [new TextRun(line.replace('- ', ''))], bullet: { level: 0 } });
            return new Paragraph(line);
        });
        const doc = new Document({ sections: [{ children: paragraphs }] });
        Packer.toBlob(doc).then(blob => { saveAs(blob, `RPP - ${rpp.judul}.docx`); });
    };

    if (isLoading) return <p>Memuat RPP...</p>;
    if (!rpp) return <p>RPP tidak ditemukan.</p>;

    return (
        <div style={{ padding: '20px' }}>
            <Link to="/perpustakaan-rpp">&larr; Kembali ke Perpustakaan</Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <h1>{rpp.judul}</h1>
                <button onClick={handleDownload}>Unduh .docx</button>
            </div>
            <p><strong>Kelas Terkait:</strong> {rpp.nama_kelas}</p>
            <hr/>
            <div style={{ border: '1px solid #ccc', padding: '15px', background: '#f9f9f9' }}>
                <ReactMarkdown>{rpp.konten_markdown}</ReactMarkdown>
            </div>
        </div>
    );
}

export default RppDetailPage;