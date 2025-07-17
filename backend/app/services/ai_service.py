import os
import PyPDF2
from PIL import Image
import pytesseract
import google.generativeai as genai
import json
from flask import current_app

pytesseract.pytesseract.tesseract_cmd = r'D:\Games\Tesseract\tesseract.exe'

class AIService:
    def __init__(self, api_key, model_name='gemini-1.5-flash'):
        if not api_key:
            raise ValueError("Kunci API Gemini harus disediakan.")
        self.api_key = api_key
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model_name)

    def _generate_content(self, prompt_parts):
        try:
            response = self.model.generate_content(prompt_parts)
            return response.text
        except Exception as e:
            # Menggunakan logger dari Flask butuh current_app, jadi kita ganti dengan print untuk skrip standalone
            print(f"Error saat menghubungi Gemini API: {e}")
            raise RuntimeError(f"Gagal menghasilkan konten dari AI: {e}")

    def extract_text_from_file(self, file_path):
        _, extension = os.path.splitext(file_path)
        text = ""
        try:
            if extension.lower() == '.pdf':
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += page.extract_text() or ""
            elif extension.lower() in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff']:
                text = pytesseract.image_to_string(Image.open(file_path))
        except Exception as e:
            current_app.logger.error(f"Gagal mengekstrak teks dari {file_path}: {e}")
        return text

    def analyze_reference_text(self, combined_text):
        prompt = f"""
        TUGAS: Analisis dan ekstrak komponen RPP dari teks di bawah ini.
        OUTPUT: Kembalikan HANYA format JSON yang berisi kunci berikut: "cp", "tp", "materi_pokok", "pertanyaan_pemantik", "model_pembelajaran", "media_sumber".
        Jika sebuah komponen tidak ditemukan, kembalikan string kosong untuk nilai kuncinya.

        --- TEKS REFERENSI ---
        {combined_text}
        """
        response_text = self._generate_content([prompt])
        try:
            clean_json_str = response_text.strip().replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json_str)
        except json.JSONDecodeError:
            current_app.logger.error("Gagal mem-parsing JSON dari hasil analisis referensi.")
            return {"cp": "", "tp": "", "materi_pokok": "", "pertanyaan_pemantik": "", "model_pembelajaran": "", "media_sumber": ""}

    def generate_rpp_from_ai(self, rpp_data, file_paths=None):
        referensi_text = ""
        if file_paths:
            for path in file_paths:
                referensi_text += self.extract_text_from_file(path) + "\n\n---\n\n"

        prompt = f"""
        # PERINTAH PEMBUATAN RENCANA PELAKSANAAN PEMBELAJARAN (RPP)

        ## BAGIAN 1: DATA UTAMA (WAJIB DIPATUHI)
        - **Nama Penyusun**: {rpp_data.get('nama_penyusun', 'Guru Pengampu')}
        - **Mata Pelajaran**: {rpp_data.get('mapel')}
        - **Jenjang/Kelas**: {rpp_data.get('jenjang')}
        - **Topik Utama**: {rpp_data.get('topik')}
        - **Alokasi Waktu**: {rpp_data.get('alokasi_waktu')}

        ## BAGIAN 2: MATERI DARI FILE REFERENSI (JIKA ADA)
        Teks berikut adalah konten dari file yang diunggah oleh pengguna.
        --- AWAL FILE REFERENSI ---
        {referensi_text if referensi_text else "Tidak ada file referensi yang diberikan."}
        --- AKHIR FILE REFERENSI ---

        ## TUGAS ANDA:
        Buatlah RPP yang lengkap, sistematis, dan profesional dalam format **Markdown**.

        ## INSTRUKSI KRITIS:
        1.  **PRIORITAS UTAMA**: Seluruh konten RPP harus secara ketat relevan dengan **Topik Utama** dari **DATA UTAMA**. Jangan menyimpang dari topik ini.
        2.  **PENGEMBANGAN KONTEN**: Gunakan kreativitas Anda untuk mengembangkan konten RPP (Tujuan Pembelajaran, Kegiatan Pembelajaran, Asesmen) agar selaras dengan **Topik Utama**.
        3.  **ENRICHMENT (PENAMBAHAN KOLOM)**: 
            - **ANALISIS FILE REFERENSI**: Analisis teks dari **BAGIAN 2**.
            - **TAMBAHKAN JIKA RELEVAN**: Jika Anda menemukan informasi yang relevan dengan **Topik Utama** untuk kolom-kolom seperti **"Profil Pelajar Pancasila"**, **"Sarana dan Prasarana"**, **"Kompetensi Awal"**, atau **"Pemahaman Bermakna"**, maka **TAMBAHKAN kolom-kolom tersebut** ke dalam RPP yang Anda hasilkan.
            - **JANGAN TAMBAHKAN JIKA TIDAK RELEVAN**: Jika informasi tersebut tidak ada atau tidak relevan, jangan paksakan untuk menambahkannya.
        4.  **STRUKTUR OUTPUT**: RPP harus memiliki struktur yang jelas, mencakup minimal:
            - A. Informasi Umum (Identitas, Nama Penyusun, Kompetensi Awal, dll.)
            - B. Komponen Inti (Tujuan Pembelajaran, Pemahaman Bermakna, Pertanyaan Pemantik)
            - C. Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup)
            - D. Asesmen/Penilaian
            - E. Lampiran (jika perlu)
        """
        return self._generate_content([prompt])

    def generate_soal_from_ai(self, sumber_materi, jenis_soal, jumlah_soal, taksonomi_bloom_level):
        prompt = f"""
        Anda adalah AI ahli dalam membuat soal evaluasi pendidikan.
        Berdasarkan materi di bawah ini, buatlah {jumlah_soal} soal jenis '{jenis_soal}' dengan tingkat kesulitan Taksonomi Bloom '{taksonomi_bloom_level}'.
        Format output HARUS berupa JSON string tunggal.
        - Untuk Pilihan Ganda: array objek dengan kunci "pertanyaan", "pilihan" (objek A, B, C, D), "jawaban_benar" (kunci dari pilihan).
        - Untuk Esai: array objek dengan kunci "pertanyaan" dan "jawaban_ideal".

        --- MATERI ---
        {sumber_materi}
        """
        return self._generate_content([prompt])

    def generate_soal_from_ai(self, sumber_materi, jenis_soal, jumlah_soal, taksonomi_bloom_level):
        prompt = f"""
        Anda adalah AI ahli dalam membuat soal evaluasi pendidikan.
        Berdasarkan materi di bawah ini, buatlah {jumlah_soal} soal jenis '{jenis_soal}' dengan tingkat kesulitan Taksonomi Bloom '{taksonomi_bloom_level}'.

        Format output HARUS berupa JSON string tunggal, tanpa markdown atau teks tambahan.
        Struktur JSON harus berupa array dari objek, di mana setiap objek adalah satu soal.
        
        - Untuk Pilihan Ganda, objek harus memiliki kunci: "pertanyaan", "pilihan" (objek dengan A, B, C, D), "jawaban_benar" (kunci dari pilihan, misal "A").
        - Untuk Esai, objek harus memiliki kunci: "pertanyaan" dan "jawaban_ideal".

        --- MATERI ---
        {sumber_materi}
        """
        return self._generate_content([prompt])