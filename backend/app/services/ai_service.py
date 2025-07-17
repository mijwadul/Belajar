import os
import PyPDF2
from PIL import Image
import pytesseract
import google.generativeai as genai
import json
from flask import current_app

pytesseract.pytesseract.tesseract_cmd = r'D:\Games\Tesseract\tesseract.exe'

class AIService:
    def __init__(self, model_name='gemini-1.5-flash'):
        self.api_key = current_app.config.get('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY tidak ditemukan di konfigurasi.")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(model_name)

    def _generate_content(self, prompt_parts):
        try:
            response = self.model.generate_content(prompt_parts)
            return response.text
        except Exception as e:
            current_app.logger.error(f"Error saat menghubungi Gemini API: {e}", exc_info=True)
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
            # Tambahkan dukungan untuk .docx jika diperlukan dengan library python-docx
            # elif extension.lower() == '.docx':
            #     doc = docx.Document(file_path)
            #     for para in doc.paragraphs:
            #         text += para.text + '\n'
        except Exception as e:
            current_app.logger.error(f"Gagal mengekstrak teks dari {file_path}: {e}")
            # Mengembalikan string kosong jika gagal, agar proses tidak berhenti
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
            # Membersihkan output sebelum parsing JSON
            clean_json_str = response_text.strip().replace('```json', '').replace('```', '').strip()
            return json.loads(clean_json_str)
        except json.JSONDecodeError:
            current_app.logger.error("Gagal mem-parsing JSON dari hasil analisis referensi.")
            # Fallback jika AI tidak mengembalikan JSON yang valid
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

        ## BAGIAN 2: KONTEKS TAMBAHAN DARI PENGGUNA (JIKA ADA)
        - **Capaian Pembelajaran**: {rpp_data.get('cp', '')}
        - **Tujuan Pembelajaran**: {rpp_data.get('tp', '')}
        - **Materi Pokok**: {rpp_data.get('materi_pokok', '')}
        - **Pertanyaan Pemantik**: {rpp_data.get('pertanyaan_pemantik', '')}
        - **Model Pembelajaran**: {rpp_data.get('model_pembelajaran', '')}
        - **Media & Sumber Belajar**: {rpp_data.get('media_sumber', '')}

        ## BAGIAN 3: MATERI DARI FILE REFERENSI (JIKA ADA)
        Teks berikut adalah konten dari file yang diunggah. Gunakan sebagai inspirasi atau sumber tambahan, TAPI JANGAN biarkan menimpa **DATA UTAMA** dan **TOPIK UTAMA**.
        --- AWAL FILE REFERENSI ---
        {referensi_text if referensi_text else "Tidak ada file referensi yang diberikan."}
        --- AKHIR FILE REFERENSI ---

        ## TUGAS ANDA:
        Buatlah RPP yang lengkap dan profesional dalam format **Markdown**.

        ## INSTRUKSI KRITIS:
        1. **PRIORITAS UTAMA**: Seluruh konten RPP harus secara ketat relevan dengan **Topik Utama** dari **DATA UTAMA**.
        2. **NAMA PENYUSUN**: Wajib mencantumkan nama penyusun di bagian identitas RPP.
        3. **PENGEMBANGAN KONTEN**: Jika ada kolom di "Konteks Tambahan" yang kosong, kembangkan isinya secara kreatif agar selaras dengan **Topik Utama**.
        4. **STRUKTUR OUTPUT**: RPP harus memiliki struktur yang jelas, mencakup minimal:
           - A. Informasi Umum (Identitas)
           - B. Tujuan Pembelajaran
           - C. Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup)
           - D. Asesmen/Penilaian
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