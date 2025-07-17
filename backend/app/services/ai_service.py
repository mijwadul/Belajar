# backend/app/services/ai_service.py

import os
import json as pyjson
import PyPDF2
from PIL import Image
import pytesseract
import google.generativeai as genai

class AIService:
    def __init__(self, model_name_str='gemini-1.5-flash'):
        """
        Inisialisasi layanan AI dengan model Gemini.
        """
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(model_name_str)

    def extract_text_from_file(self, file_path):
        """
        Mengekstrak teks dari berbagai jenis file (PDF, Gambar, Teks).
        Fungsi ini menjadi pusat ekstraksi teks untuk semua kebutuhan.
        """
        filename = os.path.basename(file_path)
        file_ext = os.path.splitext(filename)[1].lower()
        text = ""
        try:
            if file_ext == '.pdf':
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        # Menambahkan spasi agar teks antar halaman tidak menyatu
                        text += (page.extract_text() or "") + "\n"
            elif file_ext in ['.jpg', '.jpeg', '.png']:
                img = Image.open(file_path)
                text = pytesseract.image_to_string(img)
            elif file_ext == '.txt':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
            else:
                # Memberikan pesan jika format tidak didukung
                return f"[Format file '{file_ext}' tidak didukung untuk ekstraksi teks.]"
            return text.strip()
        except Exception as e:
            # Mengemas ulang error agar lebih informatif saat ditampilkan di frontend
            raise Exception(f"Gagal memproses file '{filename}': {e}") from e

    def analyze_reference_text(self, text_content):
        """
        Menganalisis teks referensi dan mengembalikan komponen RPP dalam format JSON.
        Digunakan oleh endpoint /analyze-referensi.
        """
        analysis_prompt = f"""
        Tugas Anda adalah menganalisis teks referensi berikut untuk menyusun RPP Kurikulum Merdeka.
        Baca teks dengan saksama, kemudian ekstrak informasi kunci.

        Teks Referensi:
        ---
        {text_content}
        ---

        Kelompokkan hasil ekstraksi ke dalam komponen RPP berikut dan sajikan HANYA dalam format JSON yang valid.
        Jika sebuah informasi tidak ditemukan dalam teks, biarkan nilainya berupa string kosong ("").
        
        Field JSON yang harus ada:
        - "cp": (Capaian Pembelajaran yang tersirat atau eksplisit dari teks)
        - "tp": (Tujuan Pembelajaran yang bisa dirumuskan dari teks)
        - "indikator": (Indikator atau tanda-tanda ketercapaian tujuan)
        - "materi_pokok": (Materi Pokok atau inti bahasan utama dari teks)
        - "aktivitas": (Ringkasan singkat tentang metode atau aktivitas pembelajaran yang disarankan atau tersirat)
        - "asesmen": (Ringkasan singkat tentang metode penilaian atau asesmen)
        - "profil_pancasila": (Nilai-nilai Profil Pelajar Pancasila yang relevan dari teks)
        """
        try:
            response = self.model.generate_content(analysis_prompt)
            # Membersihkan respons AI untuk memastikan hanya JSON yang valid yang diproses
            clean_response = response.text.strip().replace("```json", "").replace("```", "")
            return pyjson.loads(clean_response)
        except pyjson.JSONDecodeError as e:
            # Error jika AI tidak mengembalikan JSON yang valid
            raise Exception("Respons dari AI bukan format JSON yang valid. Coba lagi.") from e
        except Exception as e:
            # Error umum lainnya
            raise Exception(f"Gagal berkomunikasi dengan layanan AI: {e}") from e

    def generate_rpp_from_ai(self, mapel, jenjang, topik, alokasi_waktu, file_paths=None):
        """
        Menghasilkan draf RPP lengkap dalam format Markdown berdasarkan input
        dan file referensi opsional.
        """
        prompt_parts = []
        document_context_text = ""
        file_bibliografi = []

        if file_paths:
            for file_path in file_paths:
                file_bibliografi.append(os.path.basename(file_path))
                # Menggunakan fungsi ekstraksi terpusat
                document_context_text += self.extract_text_from_file(file_path) + "\n\n"
        
        if document_context_text:
            prompt_parts.append(
                "PERHATIAN: Gunakan konteks dari file referensi berikut sebagai sumber utama dalam seluruh isi RPP. Pastikan semua komponen relevan dengan isi file ini.\n---\n"
                f"{document_context_text}"
                "\n---\n\n"
            )

        prompt_parts.append(f"""
        Anda adalah AI ahli penyusun RPP Kurikulum Merdeka. Buatlah draf Modul Ajar (RPP) yang lengkap, detail, dan siap pakai.

        Gunakan seluruh input berikut untuk menyusun RPP:
        - Fase/Kelas: {jenjang}
        - Mata Pelajaran: {mapel}
        - Topik/Materi Pokok: {topik}
        - Alokasi Waktu: {alokasi_waktu}

        Struktur RPP WAJIB mencakup komponen berikut secara berurutan:
        1.  **Informasi Umum**: (Nama penyusun, institusi, tahun, jenjang, kelas, alokasi waktu)
        2.  **Komponen Inti**:
            - **Tujuan Pembelajaran**: (Deskripsikan tujuan yang jelas dan terukur)
            - **Pemahaman Bermakna**: (Jelaskan manfaat yang akan siswa peroleh)
            - **Pertanyaan Pemantik**: (Buat 2-3 pertanyaan yang memancing rasa ingin tahu)
            - **Profil Pelajar Pancasila**: (Sebutkan 2-3 dimensi yang relevan)
            - **Kegiatan Pembelajaran**: (Rincian langkah-langkah: Pendahuluan, Inti, Penutup)
            - **Asesmen**: (Jelaskan teknik asesmen: Diagnostik, Formatif, Sumatif)
            - **Pengayaan dan Remedial**: (Jelaskan kegiatan untuk kedua kelompok siswa)
            - **Refleksi Peserta Didik dan Guru**: (Buat daftar pertanyaan refleksi)
        3.  **Lampiran**:
            - **Lembar Kerja Peserta Didik (LKPD)**
            - **Bahan Bacaan Guru & Peserta Didik**
            - **Glosarium**
            - **Daftar Pustaka**

        Format output harus dalam **Markdown** yang rapi. Jangan tambahkan penjelasan di luar struktur RPP.
        """
        )
        if file_bibliografi:
            prompt_parts.append("\n\n**Daftar Pustaka Tambahan:**\n" + "\n".join(f"- {f}" for f in file_bibliografi))

        full_prompt = "".join(prompt_parts)
        
        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Terjadi kesalahan saat berkomunikasi dengan AI untuk RPP: {e}") from e

    def generate_soal_from_ai(self, sumber_materi, jenis_soal, jumlah_soal, taksonomi_bloom_level):
        """
        Membuat soal evaluasi dari sumber materi RPP.
        """
        prompt = f"""
        Anda adalah seorang guru ahli dalam membuat soal evaluasi berdasarkan RPP.
        Dari sumber materi berikut, buatkan satu set soal.

        ---
        **SUMBER MATERI (RPP):**
        {sumber_materi}
        ---

        **INSTRUKSI:**
        1.  **Jenis Soal**: {jenis_soal}
        2.  **Jumlah Soal**: Buat tepat {jumlah_soal} soal.
        3.  **Tingkat Kognitif**: Sesuaikan dengan level **{taksonomi_bloom_level}** pada Taksonomi Bloom.
        4.  **Format Output**: Kembalikan HANYA dalam format JSON yang valid, tanpa teks tambahan.

        Contoh struktur JSON:
        - Pilihan Ganda: {{ "soal": [{{ "pertanyaan": "...", "pilihan": {{ "A": "...", "B": "..." }}, "jawaban_benar": "A" }}] }}
        - Esai: {{ "soal": [{{ "pertanyaan": "...", "jawaban_ideal": "..." }}] }}
        """
        try:
            response = self.model.generate_content(prompt)
            json_output = response.text.strip().replace("```json", "").replace("```", "")
            return json_output
        except Exception as e:
            raise Exception(f"Terjadi kesalahan saat berkomunikasi dengan AI untuk soal: {e}") from e