import google.generativeai as genai
import os
import json

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def generate_rpp_from_ai(mapel, jenjang, topik, alokasi_waktu, file_upload=None):
    """
    Membuat draf RPP, dengan file sebagai konteks jika disediakan.
    """
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    Anda adalah seorang ahli Kurikulum Merdeka di Indonesia.
    Berdasarkan informasi di bawah ini DAN file yang saya unggah (jika ada), tolong buatkan draf Modul Ajar yang sangat detail. Jadikan file yang diunggah sebagai sumber referensi utama.

    **Informasi Modul Ajar:**
    - Fase/Kelas: {jenjang}
    - Mata Pelajaran: {mapel}
    - Topik/Materi Pokok: {topik}
    - Alokasi Waktu: {alokasi_waktu}

    (Gunakan seluruh aturan dan struktur RPP Kurikulum Merdeka yang sudah Anda ketahui sebelumnya, termasuk aturan aksara khusus dan penyesuaian jenjang).
    """

    try:
        konten_untuk_ai = [prompt]
        if file_upload:
            konten_untuk_ai.append(file_upload)
        
        response = model.generate_content(konten_untuk_ai)
        return response.text
    except Exception as e:
        print(f"Error saat memanggil AI untuk RPP: {e}")
        return "Terjadi kesalahan saat berkomunikasi dengan AI."

def generate_soal_from_ai(sumber_materi, jenis_soal, jumlah_soal, tingkat_kesulitan):
    """
    Membuat soal evaluasi dari sumber materi (RPP).
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
    3.  **Tingkat Kesulitan**: Buat soal yang sesuai dengan tingkat kognitif **{tingkat_kesulitan}** pada Taksonomi Bloom.
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
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        json_output = response.text.strip().replace("```json", "").replace("```", "")
        return json_output
    except Exception as e:
        print(f"Error saat memanggil AI untuk membuat soal: {e}")
        return json.dumps({ "error": "Terjadi kesalahan saat berkomunikasi dengan AI." })