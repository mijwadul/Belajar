import google.generativeai as genai
import os
import json
import PyPDF2 # Import PyPDF2 untuk ekstraksi PDF

class AIService:
    # Konstruktor menerima model_name_str sebagai parameter
    def __init__(self, model_name_str): #
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        # Menggunakan model_name_str yang diterima
        self.model = genai.GenerativeModel(model_name_str)
        # Inisialisasi sesi chat (opsional, tergantung kebutuhan percakapan berkelanjutan)
        self.chat_session = self.model.start_chat(history=[])

    def _extract_text_from_pdf(self, file_path):
        """Mengekstrak teks dari file PDF."""
        text = ""
        try:
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page_num in range(len(reader.pages)):
                    page = reader.pages[page_num]
                    text += page.extract_text() or "" # extract_text() bisa mengembalikan None
            return text
        except Exception as e:
            raise Exception(f"Gagal mengekstrak teks dari PDF: {e}")

    # Metode untuk ekstraksi teks dari DOCX atau TXT dapat ditambahkan di sini
    # def _extract_text_from_docx(self, file_path): ...
    # def _extract_text_from_txt(self, file_path): ...

    def generate_rpp_from_ai(self, mapel, jenjang, topik, alokasi_waktu, file_path=None):
        """
        Membuat draf RPP, dengan file sebagai konteks jika disediakan.
        `jenjang` diharapkan sudah dalam format spesifik seperti "SD Kelas 1A".
        """
        prompt_parts = []
        document_context_text = ""

        if file_path:
            file_extension = os.path.splitext(file_path)[1].lower()
            if file_extension == '.pdf':
                document_context_text = self._extract_text_from_pdf(file_path)
            # elif file_extension == '.docx':
            #     document_context_text = self._extract_text_from_docx(file_path)
            # elif file_extension == '.txt':
            #     document_context_text = self._extract_text_from_txt(file_path)
            else:
                print(f"Warning: Tipe file '{file_extension}' tidak didukung untuk ekstraksi teks.")
        
        # Tambahkan teks dokumen yang diekstrak ke prompt jika ada, dengan penekanan sebagai REFERENSI UTAMA
        if document_context_text:
            prompt_parts.append(f"Materi utama untuk RPP ini diambil dari dokumen referensi berikut. Mohon gunakan dokumen ini sebagai sumber utama dan ikuti alur serta inti dari dokumen tersebut:\n---\n{document_context_text}\n---\n\n")

        prompt_parts.append(f"""
Anda adalah seorang ahli Kurikulum Merdeka di Indonesia.
Berdasarkan informasi di bawah ini, tolong buatkan draf Modul Ajar yang sangat detail.
Fokus pada **{jenjang}** untuk penyesuaian konten dan pedagogi.

**Informasi Modul Ajar:**
- Fase/Kelas: {jenjang}
- Mata Pelajaran: {mapel}
- Topik/Materi Pokok: {topik}
- Alokasi Waktu: {alokasi_waktu}

Sertakan komponen-komponen RPP yang lengkap (Pendahuluan, Kegiatan Inti, Penutup, Penilaian, Sumber Belajar, dll.).
**Pastikan Indikator Pembelajaran dan Tujuan Pembelajaran juga Anda hasilkan** berdasarkan topik dan materi.
Format RPP dalam Markdown.
""")

        full_prompt = "".join(prompt_parts)
        
        try:
            response = self.model.generate_content(full_prompt)
            
            if hasattr(response, 'parts') and response.parts:
                return "".join([part.text for part in response.parts])
            return response.text
        except Exception as e:
            print(f"Error saat memanggil AI untuk RPP: {e}")
            raise Exception(f"Terjadi kesalahan saat berkomunikasi dengan AI: {e}")

    # PERUBAHAN: Mengganti tingkat_kesulitan dengan taksonomi_bloom_level
    def generate_soal_from_ai(self, sumber_materi, jenis_soal, jumlah_soal, taksonomi_bloom_level):
        """
        Membuat soal evaluasi dari sumber materi (RPP).
        Parameter tingkat_kesulitan diganti dengan taksonomi_bloom_level.
        """
        prompt = f"""
    Anda adalah seorang guru ahli dalam membuat soal evaluasi yang sesuai dengan Kurikulum Merdeka dan Taksonomi Bloom.
    Berdasarkan sumber materi di bawah ini, buatkan satu set soal.

    ---
    **SUMBER MATERI (RPP):**
    {sumber_materi}
    ---

    **INSTRUKSI PEMBUATAN SOAL:**
    1.  **Jenis Soal**: {jenis_soal}
    2.  **Jumlah Soal**: Buat tepat {jumlah_soal} soal.
    3.  **Tingkat Kognitif (Taksonomi Bloom)**: Buat soal yang sesuai dengan level **{taksonomi_bloom_level}** pada Taksonomi Bloom. Fokuslah pada aspek kognitif dari level tersebut.
    4.  **Sertakan Kunci Jawaban**: Untuk setiap soal, sertakan kunci jawabannya.
    5.  **Format Output**: Kembalikan hasilnya HANYA dalam format JSON yang valid. Jangan tambahkan teks atau penjelasan lain di luar JSON.

    **Contoh Struktur JSON yang Diharapkan:**
    - Untuk "Pilihan Ganda":
    {{
        "soal": [
            {{
                "pertanyaan": "Teks pertanyaan di sini...",
                "pilihan": {{ "A": "...", "B": "...", "C": "...", "D": "..." }},
                "jawaban_benar": "A"
            }}
        ]
    }}
    - Untuk "Esai Singkat":
    {{
        "soal": [
            {{
                "pertanyaan": "Teks pertanyaan esai di sini...",
                "jawaban_ideal": "Contoh jawaban ideal atau poin-poin penting yang harus ada."
            }}
        ]
    }}

    Pastikan semua pertanyaan relevan dengan sumber materi yang diberikan.
    """
        
        try:
            response = self.model.generate_content(prompt)
            json_output = response.text.strip().replace("```json", "").replace("```", "")
            return json_output
        except Exception as e:
            print(f"Error saat memanggil AI untuk membuat soal: {e}")
            raise Exception(f"Terjadi kesalahan saat berkomunikasi dengan AI: {e}")