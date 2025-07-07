// frontend/src/pages/SoalDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSoalById } from '../api/aiService';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

function SoalDetailPage() {
    const { id } = useParams();
    const [soalSet, setSoalSet] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const muatData = async () => {
            try {
                const data = await getSoalById(id);
                setSoalSet(data);
            } catch (error) {
                console.error("Gagal memuat detail soal:", error);
            } finally {
                setIsLoading(false);
            }
        };
        muatData();
    }, [id]);

    const handleUnduhSoal = () => {
        if (!soalSet || !soalSet.konten_json) return;
        
        const paragraphs = [];
        soalSet.konten_json.forEach((item, index) => {
            paragraphs.push(new Paragraph({ children: [new TextRun({ text: `${index + 1}. ${item.pertanyaan}`, bold: true })] }));
            if (item.pilihan) {
                Object.entries(item.pilihan).forEach(([key, value]) => {
                    paragraphs.push(new Paragraph({ children: [new TextRun(`   ${key}. ${value}`)], indent: { left: 720 } }));
                });
            }
            paragraphs.push(new Paragraph(""));
        });
        
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "KUNCI JAWABAN", bold: true, underline: true })] }));
        soalSet.konten_json.forEach((item, index) => {
            paragraphs.push(new Paragraph(`${index + 1}. ${item.jawaban_benar || item.jawaban_ideal}`));
        });

        const doc = new Document({ sections: [{ children: paragraphs }] });
        Packer.toBlob(doc).then(blob => { saveAs(blob, `${soalSet.judul}.docx`); });
    };

    if (isLoading) return <p>Memuat set soal...</p>;
    if (!soalSet) return <p>Set soal tidak ditemukan.</p>;

    return (
        <div style={{ padding: '20px' }}>
            <Link to="/bank-soal">&larr; Kembali ke Bank Soal</Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
                <h1>{soalSet.judul}</h1>
                <button onClick={handleUnduhSoal}>Unduh .docx</button>
            </div>
            <p><strong>Dibuat dari RPP:</strong> {soalSet.judul_rpp}</p>
            <hr/>
            <div style={{ border: '1px solid #ccc', padding: '15px', background: '#f9f9f9' }}>
                <ol>
                    {(soalSet.konten_json || []).map((item, index) => (
                        <li key={index} style={{ marginBottom: '15px' }}>
                            <p>{item.pertanyaan}</p>
                            {item.pilihan && (
                                <ul style={{ listStyleType: 'upper-alpha' }}>
                                    {Object.entries(item.pilihan).map(([key, value]) => ( <li key={key}>{value}</li> ))}
                                </ul>
                            )}
                            <p><strong>Jawaban:</strong> {item.jawaban_benar || item.jawaban_ideal}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

export default SoalDetailPage;