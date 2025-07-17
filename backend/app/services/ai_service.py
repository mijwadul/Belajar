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

    def generate_rpp_from_ai(self, mapel, jenjang, topik, alokasi_waktu, file_paths=None):
        """
        Membuat draf RPP, dengan satu atau lebih file sebagai konteks jika disediakan.
        `jenjang` diharapkan sudah dalam format spesifik seperti "SD Kelas 1A".
        file_paths: list of file paths (pdf, docx, txt, image)
        """
        prompt_parts = []
        document_context_texts = []

        # --- NEW: Ekstraksi isi file dan deteksi otomatis jika input kosong ---
        extracted_texts = []
        file_bibliografi = []
        if file_paths:
            for file_path in file_paths:
                file_extension = os.path.splitext(file_path)[1].lower()
                file_bibliografi.append(os.path.basename(file_path))
                text = None
                if file_extension == '.pdf':
                    text = self._extract_text_from_pdf(file_path)
                # elif file_extension == '.docx':
                #     text = self._extract_text_from_docx(file_path)
                # elif file_extension == '.txt':
                #     text = self._extract_text_from_txt(file_path)
                elif file_extension in ['.jpg', '.jpeg', '.png']:
                    try:
                        import pytesseract
                        from PIL import Image
                        img = Image.open(file_path)
                        text = pytesseract.image_to_string(img)
                    except Exception as e:
                        print(f"Gagal ekstrak teks dari gambar {file_path}: {e}")
                if text:
                    extracted_texts.append(text)
        # --- END EKSTRAKSI ---

        # --- NEW: Deteksi otomatis topik/mapel/kelas jika input kosong ---
        # (Sederhana: ambil kalimat pertama/keyword dari file, bisa dikembangkan NLP lebih lanjut)
        if (not topik or not mapel or not jenjang) and extracted_texts:
            combined_text = "\n".join(extracted_texts)
            if not topik:
                topik = combined_text.split(". ")[0][:100]  # Ambil kalimat pertama max 100 char
            if not mapel:
                mapel = "(deteksi otomatis)"  # Bisa pakai NLP/regex untuk mapel
            if not jenjang:
                jenjang = "(deteksi otomatis)"  # Bisa pakai NLP/regex untuk jenjang

        if file_paths:
            for file_path in file_paths:
                file_extension = os.path.splitext(file_path)[1].lower()
                if file_extension == '.pdf':
                    text = self._extract_text_from_pdf(file_path)
                    if text:
                        document_context_texts.append(text)
                # elif file_extension == '.docx':
                #     text = self._extract_text_from_docx(file_path)
                #     if text:
                #         document_context_texts.append(text)
                # elif file_extension == '.txt':
                #     text = self._extract_text_from_txt(file_path)
                #     if text:
                #         document_context_texts.append(text)
                elif file_extension in ['.jpg', '.jpeg', '.png']:
                    # For images, use OCR to extract text (future-proof for mobile/camera)
                    try:
                        import pytesseract
                        from PIL import Image
                        img = Image.open(file_path)
                        text = pytesseract.image_to_string(img)
                        if text:
                            document_context_texts.append(f"[Ekstraksi dari gambar: {os.path.basename(file_path)}]\n{text}")
                    except Exception as e:
                        print(f"Gagal ekstrak teks dari gambar {file_path}: {e}")
                else:
                    print(f"Warning: Tipe file '{file_extension}' tidak didukung untuk ekstraksi teks.")

        # Gabungkan semua konteks dokumen
        if extracted_texts:
            prompt_parts.append(
                "PERHATIAN: File referensi berikut WAJIB dijadikan sumber utama dalam seluruh isi RPP. Seluruh tujuan, aktivitas, asesmen, dan komponen RPP harus relevan dan terhubung dengan isi file ini. Jika ada bagian yang tidak relevan, prioritaskan isi file.\n---\n"
                + "\n---\n".join(extracted_texts)
                + "\n---\n\n"
            )
    # Untuk pengembangan ke depan: support multiple file uploads (camera, dokumen, dsb)
    # Pastikan frontend mengirimkan file_paths sebagai list

        prompt_parts.append(f"""
Anda adalah AI yang bertugas membuat RPP Kurikulum Merdeka berbasis Deep Learning untuk guru Indonesia.
Buat RPP satu lembar yang STRUKTUR dan ISINYA WAJIB memenuhi kriteria berikut:

📋 Kriteria RPP Kurikulum Merdeka Berbasis Deep Learning
1. Tujuan Pembelajaran Berbasis Capaian (CP) yang Bermakna
   - Berdasarkan CP Kurikulum Merdeka (Kemendikbud, 2022)
   - Tujuan: pemahaman konsep mendalam, kompetensi esensial, profil pelajar Pancasila
2. Aktivitas Pembelajaran: Mendalam, Aktif, Reflektif
   - Berpikir kritis, analitis, kreatif (HOTS, C3–C6)
   - Pemecahan masalah nyata, eksplorasi aktif, diskusi, studi kasus, eksperimen, refleksi
3. Keterlibatan Emosi dan Kesadaran (Mindful Learning)
   - Sentuh sisi emosional, sosial, dan motivasi intrinsik siswa
   - Bangun kesadaran penuh (mindfulness)
4. Asesmen Formatif dan Autentik
   - Observasi, portofolio, proyek, presentasi, rubrik kualitatif, umpan balik naratif, refleksi
5. Pembelajaran Berdiferensiasi
   - Akomodasi minat, kesiapan, gaya belajar, pilihan tugas/media/ekspresi
6. Berbasis Proyek dan Kontekstual
   - PBL/PJBL, konteks lokal, isu nyata, kolaborasi lintas muatan
7. Integrasi Profil Pelajar Pancasila
   - Wajib memuat 1–2 dimensi profil (misal: kritis, mandiri, kreatif, global)
8. Struktur RPP Satu Lembar
   - Tujuan Pembelajaran
   - Langkah-langkah Pembelajaran (Aktivitas)
   - Asesmen Pembelajaran
   - Substansi mendalam dan transformatif

Gunakan seluruh input berikut secara eksplisit dan relevan dalam setiap bagian RPP:
- Fase/Kelas: {jenjang}
- Mata Pelajaran: {mapel}
- Topik/Materi Pokok: {topik}
- Alokasi Waktu: {alokasi_waktu}

Jika ada file referensi, pastikan seluruh isi RPP (tujuan, aktivitas, asesmen, dsb) benar-benar relevan dan terhubung dengan isi file tersebut.
Jika tidak ada file, tetap ikuti kriteria Kurikulum Merdeka Deep Learning.

Format output markdown WAJIB mengikuti ringkasan berikut:

| Komponen   | Kriteria Deep Learning |
|------------|-----------------------|
| Tujuan     | Berdasarkan CP, bermakna, menumbuhkan profil Pancasila |
| Aktivitas  | Eksplorasi, refleksi, pemecahan masalah nyata |
| Asesmen    | Formatif, autentik, reflektif |
| Diferensiasi| Minat, kesiapan, gaya belajar |
| Metode     | PJBL/PBL, kolaboratif, kontekstual |
| Karakter   | Critical thinking, kreatif, peduli |
| Emosi      | Mindful, meaningful, durable |
| Profil Pancasila | Disisipkan dalam kegiatan dan asesmen |

Tampilkan RPP dalam format markdown yang rapi, terstruktur, dan mudah dipahami. Jangan tambahkan penjelasan di luar RPP.

# Daftar Pustaka
Cantumkan daftar pustaka/file referensi berikut di akhir RPP:
"""
        )
        if file_bibliografi:
            prompt_parts.append("\n".join(f"- {f}" for f in file_bibliografi))

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