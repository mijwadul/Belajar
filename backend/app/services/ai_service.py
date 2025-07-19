import os
import PyPDF2
from PIL import Image
import pytesseract
from together import Together
import json
from flask import current_app
#import google.generativeai as genai
from googleapiclient.discovery import build

pytesseract.pytesseract.tesseract_cmd = r'D:\Games\Tesseract\tesseract.exe'

class AIService:
    def __init__(self, api_key, model_name) : #'gemini-1.5-flash')
        if not api_key:
            raise ValueError("Kunci API harus disediakan.")
        self.api_key = api_key
        self.model_name = model_name # Simpan nama model
        self.client = Together(api_key=self.api_key)
        #genai.configure(api_key=self.api_key)
        #self.model = genai.GenerativeModel(model_name)

        google_api_key = current_app.config.get('GOOGLE_API_KEY')
        google_cse_id = current_app.config.get('GOOGLE_CSE_ID')

        if google_api_key and google_cse_id:
            self.search_service = build("customsearch", "v1", developerKey=google_api_key)
            self.google_cse_id = google_cse_id
            current_app.logger.info("Google Custom Search API service initialized.")
        else:
            self.search_service = None
            self.google_cse_id = None
            current_app.logger.warning("Google Custom Search API keys (GOOGLE_API_KEY, GOOGLE_CSE_ID) not found in app config. Image search will be skipped.")

    def _generate_content(self, prompt_parts):
        try:
            messages_payload = []
            if isinstance(prompt_parts, list):
                messages_payload.append({"role": "user", "content": "".join(prompt_parts)})
            else:
                messages_payload.append({"role": "user", "content": prompt_parts})

            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages_payload
            )
            return response.choices[0].message.content
        except Exception as e:
            current_app.logger.error(f"Error saat menghubungi Together AI API: {e}", exc_info=True)
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

    def generate_soal_from_ai(self, sumber_materi, jenis_soal, jumlah_soal, jenjang):
        
        try:
            with open("rules.txt", "r", encoding="utf-8") as f:
                pedoman_soal = f.read()
        except FileNotFoundError:
            pedoman_soal = "Pedoman tidak ditemukan. Buat soal berdasarkan praktik terbaik umum."

        prompt = f"""
        Anda adalah seorang ahli pedagogi dan pembuat soal ujian yang sangat berpengalaman.
        Tugas Anda adalah membuat {jumlah_soal} soal jenis '{jenis_soal}'.

        **PEDOMAN WAJIB PEMBUATAN SOAL:**
        Anda **HARUS** mengikuti pedoman di bawah ini untuk menyesuaikan tingkat kesulitan kognitif (Taksonomi Bloom), gaya bahasa, dan jumlah opsi jawaban berdasarkan **Jenjang Target**.
        ---
        {pedoman_soal}
        ---

        **INFORMASI SPESIFIK UNTUK TUGAS INI:**
        - **Jenjang Target**: {jenjang}
        - **Materi Utama**: 
        ---
        {sumber_materi}
        ---

        **FORMAT OUTPUT (JSON STRING TUNGGAL):**
        1.  Format output HARUS berupa JSON string tunggal yang valid, tanpa markdown atau teks pembuka/penutup.
        2.  Struktur JSON adalah sebuah array dari objek, di mana setiap objek adalah satu soal.
        3.  Setiap objek soal HARUS memiliki kunci "pertanyaan".
        4.  Jika `jenis_soal` adalah 'Pilihan Ganda', tambahkan kunci "pilihan" (objek) dan "jawaban_benar".
        5.  Jika `jenis_soal` adalah 'Esai Singkat', tambahkan kunci "jawaban_ideal".
        6.  **INSTRUKSI PENTING UNTUK VISUAL:**
            a.  **UNTUK TABEL:** Jika pertanyaan membutuhkan tabel, buatlah tabel tersebut langsung di dalam kunci "pertanyaan" menggunakan format Markdown.
            b.  **UNTUK GAMBAR:** Jika soal akan lebih baik dengan ilustrasi, tambahkan kunci **"deskripsi_gambar"** berisi deskripsi detail untuk agen pencari gambar, termasuk saran gaya (misal: "diagram ilustrasi", "foto historis"). Jika tidak perlu gambar, jangan sertakan kunci ini.

        Patuhi semua instruksi dengan saksama untuk menghasilkan soal yang berkualitas tinggi dan sesuai secara pedagogis.
        """
        return self._generate_content([prompt])
    
    # Search for images based on the description in the soal
    def search_images_for_soal(self, soal_list):
        if not self.search_service or not self.google_cse_id:
            current_app.logger.warning("Google Custom Search API not initialized. Skipping image search for soal.")
            return soal_list # Kembalikan daftar soal asli jika layanan tidak tersedia

        for soal in soal_list:
            if "deskripsi_gambar" in soal and soal["deskripsi_gambar"]:
                query = soal["deskripsi_gambar"]
                search_query_with_params = f"{query} educational content" # Tambahkan 'educational content' atau sejenisnya
                
                try:
                    # Panggil Google Custom Search API yang sesungguhnya
                    res = self.search_service.cse().list(
                        q=search_query_with_params,
                        cx=self.google_cse_id,
                        searchType='image',
                        num=1 # Ambil 1 gambar paling relevan
                    ).execute()

                    if res and 'items' in res and res['items']:
                        image_url = res['items'][0]['link']
                        soal["saran_gambar"] = [image_url] # Simpan sebagai list, karena bisa ada multiple
                        current_app.logger.info(f"Gambar ditemukan untuk '{query}': {image_url}")
                    else:
                        current_app.logger.info(f"Tidak ada gambar ditemukan untuk '{query}'.")
                        soal["saran_gambar"] = [] # Kosongkan jika tidak ada gambar
                except Exception as e:
                    current_app.logger.error(f"Error saat mencari gambar untuk '{query}': {e}", exc_info=True)
                    soal["saran_gambar"] = [] # Kosongkan jika terjadi error
        
        return soal_list