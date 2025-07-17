# backend/app/services/ai_service.py

import os
import json as pyjson
import PyPDF2
from PIL import Image
import pytesseract
import google.generativeai as genai

pytesseract.pytesseract.tesseract_cmd = r'D:\Games\Tesseract\tesseract.exe'

class AIService:
    def __init__(self, model_name_str='gemini-1.5-flash'):
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        self.model = genai.GenerativeModel(model_name_str)

    def extract_text_from_file(self, file_path):
        filename = os.path.basename(file_path)
        file_ext = os.path.splitext(filename)[1].lower()
        text = ""
        try:
            if file_ext == '.pdf':
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    for page in reader.pages:
                        text += (page.extract_text() or "") + "\n"
            elif file_ext in ['.jpg', '.jpeg', '.png']:
                img = Image.open(file_path)
                text = pytesseract.image_to_string(img)
            elif file_ext == '.txt':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
            else:
                return f"[Format file '{file_ext}' tidak didukung untuk ekstraksi teks.]"
            return text.strip()
        except Exception as e:
            raise Exception(f"Gagal memproses file '{filename}': {e}") from e

    def analyze_reference_text(self, text_content):
        analysis_prompt = f"""
        Tugas Anda adalah menganalisis teks referensi berikut untuk menyusun RPP Kurikulum Merdeka.
        Baca teks dengan saksama, kemudian ekstrak informasi kunci berikut.

        Teks Referensi:
        ---
        {text_content}
        ---

        Sajikan hasil dalam format JSON valid. Jika ada informasi yang tidak ditemukan, beri nilai string kosong ("").

        {{
            "cp": "",  // Capaian Pembelajaran
            "tp": "",  // Tujuan Pembelajaran
            "indikator": "",
            "materi_pokok": "",
            "aktivitas": "",
            "asesmen": "",
            "profil_pancasila": ""
        }}
        """
        try:
            response = self.model.generate_content(analysis_prompt)
            clean_response = response.text.strip().replace("```json", "").replace("```", "")
            return pyjson.loads(clean_response)
        except pyjson.JSONDecodeError as e:
            raise Exception("Respons dari AI bukan format JSON yang valid. Coba lagi.") from e
        except Exception as e:
            raise Exception(f"Gagal berkomunikasi dengan layanan AI: {e}") from e

    def generate_rpp_from_ai(self, mapel, jenjang, topik, alokasi_waktu, file_paths=None):
        prompt_parts = []
        document_context_text = ""
        file_bibliografi = []

        if file_paths:
            for file_path in file_paths:
                file_bibliografi.append(os.path.basename(file_path))
                document_context_text += self.extract_text_from_file(file_path) + "\n\n"

        if document_context_text:
            prompt_parts.append(
                "Gunakan referensi berikut sebagai sumber utama untuk menyusun RPP yang relevan dan kontekstual.\n\n"
                "---\n"
                f"{document_context_text}"
                "---\n\n"
            )

        prompt_parts.append(f"""
Anda adalah AI asisten perancang kurikulum yang sangat teliti dan ahli dalam menyusun RPP Kurikulum Merdeka.
Tugas utama Anda adalah membuat RPP yang 100% FOKUS pada data utama yang diberikan.

🔹 **Data Utama (WAJIB DIPATUHI)**
- **Mata Pelajaran:** {mapel}
- **Jenjang/Kelas:** {jenjang}
- **Topik Utama:** {topik}
- **Alokasi Waktu:** {alokasi_waktu}

🔹 **Instruksi Kritis untuk Penggunaan Referensi**
- Jika ada teks referensi (dari file), gunakan HANYA untuk mendapatkan inspirasi kegiatan, contoh asesmen, atau detail tambahan yang relevan dengan **Topik Utama** di atas.
- **PERINGATAN:** JANGAN PERNAH mengganti Mata Pelajaran atau Topik Utama dengan konten dari file referensi.
- Jika teks referensi membahas topik yang sama sekali berbeda (misalnya, Topik Utama adalah 'Gerak Dasar' tetapi referensi membahas 'Siklus Kupu-Kupu'), **ABAIKAN ISI FILE REFERENSI SEPENUHNYA**.

🔹 **Struktur RPP yang Harus Dihasilkan (Format Markdown)**

1.  **Informasi Umum**
    - Penyusun: (Isi dengan "AI Kurikulum Merdeka")
    - Tahun Ajaran: (Gunakan tahun ajaran saat ini)
    - Jenjang/Kelas: {jenjang}
    - Mata Pelajaran: {mapel}
    - Alokasi Waktu: {alokasi_waktu}

2.  **Komponen Inti**
    - **Tujuan Pembelajaran:** Rumuskan tujuan yang spesifik, terukur, dan relevan langsung dengan **Topik Utama**.
    - **Pemahaman Bermakna:** Jelaskan manfaat mempelajari **Topik Utama** ini dalam kehidupan sehari-hari siswa.
    - **Pertanyaan Pemantik:** Buat minimal 2 pertanyaan yang memancing rasa ingin tahu siswa tentang **Topik Utama**.
    - **Profil Pelajar Pancasila:** Pilih 2-3 dimensi yang paling relevan dengan aktivitas pembelajaran.
    - **Kegiatan Pembelajaran:**
        - **Pendahuluan:** (Apersepsi, motivasi, penyampaian tujuan)
        - **Kegiatan Inti:** Rancang aktivitas yang berpusat pada siswa (misalnya, Project Based Learning, Discovery Learning, simulasi, permainan) untuk mengeksplorasi **Topik Utama**.
        - **Penutup:** (Kesimpulan, refleksi, umpan balik)
    - **Asesmen:** Rancang 3 jenis asesmen (diagnostik, formatif, sumatif) yang sesuai.
    - **Pengayaan dan Remedial:** Berikan ide kegiatan untuk siswa yang cepat paham dan yang butuh bimbingan.
    - **Refleksi Siswa dan Guru:** Buat pertanyaan reflektif untuk kedua belah pihak.

3.  **Lampiran**
    - **LKPD (Lembar Kerja Peserta Didik):** Buat contoh LKPD sederhana yang relevan.
    - **Bahan Bacaan:** Ringkas materi bacaan untuk guru dan siswa.
    - **Glosarium:** Jelaskan istilah-istilah kunci terkait **Topik Utama**.
    - **Daftar Pustaka:** Jika file referensi digunakan, sebutkan di sini.

🔹 **Aturan Output Final**
- Hasilkan output dalam format **Markdown** yang rapi.
- Gunakan bahasa yang komunikatif dan mudah dipahami untuk jenjang {jenjang}.
- Pastikan semua komponen RPP yang dihasilkan secara ketat berkaitan dengan **Mata Pelajaran: {mapel}** dan **Topik Utama: {topik}**.
""")
        if file_bibliografi:
            prompt_parts.append("\n**Daftar Referensi Digunakan:**\n" + "\n".join(f"- {f}" for f in file_bibliografi))

        full_prompt = "".join(prompt_parts)

        try:
            response = self.model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            raise Exception(f"Terjadi kesalahan saat berkomunikasi dengan AI untuk RPP: {e}") from e

    def generate_soal_from_ai(self, sumber_materi, jenis_soal, jumlah_soal, taksonomi_bloom_level):
        prompt = f"""
Anda adalah guru ahli dalam membuat soal berdasarkan RPP.

Buatkan soal dari materi berikut:
---
{sumber_materi}
---

Instruksi:
- Jenis Soal: {jenis_soal}
- Jumlah: {jumlah_soal}
- Level Kognitif: {taksonomi_bloom_level}
- Output: JSON valid

Contoh struktur JSON:
- Pilihan Ganda:
  {{
    "soal": [
      {{
        "pertanyaan": "...",
        "pilihan": {{ "A": "...", "B": "...", "C": "...", "D": "..." }},
        "jawaban_benar": "B"
      }}
    ]
  }}
- Esai:
  {{
    "soal": [
      {{
        "pertanyaan": "...",
        "jawaban_ideal": "..."
      }}
    ]
  }}
"""
        try:
            response = self.model.generate_content(prompt)
            json_output = response.text.strip().replace("```json", "").replace("```", "")
            return json_output
        except Exception as e:
            raise Exception(f"Terjadi kesalahan saat berkomunikasi dengan AI untuk soal: {e}") from e
