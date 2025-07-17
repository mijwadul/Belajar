# backend/app/api/ai_tools.py

import json as pyjson
import os
import uuid
import tempfile
import shutil
import io
import random

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.classroom_model import RPP, Kelas, Soal, Ujian
from app.services.ai_service import AIService
from app.api.auth import roles_required

# Import untuk ekstraksi file dan pembuatan PDF
import PyPDF2
from PIL import Image
import pytesseract
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib.units import inch

# --- Inisialisasi Blueprint dan Service ---
# Didefinisikan sekali di sini untuk digunakan oleh semua endpoint di file ini.
bp = Blueprint('ai_api', __name__, url_prefix='/api')
ai_service_instance = AIService(current_app.config.get('GEMINI_MODEL', 'gemini-1.5-flash'))


# --- RUTE UNTUK ANALISIS REFERENSI ---
@bp.route('/analyze-referensi', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def analyze_referensi_endpoint():
    """
    Endpoint untuk menerima BEBERAPA file referensi, mengekstrak isinya,
    dan meminta AI untuk menganalisis teks tersebut menjadi komponen RPP.
    """
    if 'file' not in request.files:
        return jsonify({'message': 'Request harus menyertakan setidaknya satu file.'}), 400

    uploaded_files = request.files.getlist('file') # <-- PERBAIKAN: Gunakan getlist

    if not uploaded_files or uploaded_files[0].filename == '':
        return jsonify({'message': 'Tidak ada file yang dipilih.'}), 400

    # Menggunakan direktori sementara yang aman untuk menyimpan file
    temp_dir = tempfile.mkdtemp()
    
    combined_text = ""
    bibliography = []

    try:
        for file_storage in uploaded_files:
            if file_storage and file_storage.filename:
                file_path = os.path.join(temp_dir, file_storage.filename)
                file_storage.save(file_path)
                
                # 1. Ekstrak teks dari setiap file dan gabungkan
                extracted_text = ai_service_instance.extract_text_from_file(file_path)
                combined_text += extracted_text + "\n\n" # Gabungkan teks dengan pemisah
                bibliography.append(file_storage.filename) # Tambahkan nama file ke bibliografi

        if not combined_text.strip():
            return jsonify({'message': 'Gagal mengekstrak teks dari file atau semua file kosong.'}), 400

        # 2. Analisis gabungan teks yang sudah diekstrak
        analysis_result = ai_service_instance.analyze_reference_text(combined_text)
        
        # 3. Tambahkan semua nama file ke bibliografi
        analysis_result['bibliografi'] = bibliography

        return jsonify(analysis_result)

    except Exception as e:
        # Log error untuk debugging
        current_app.logger.error(f"Error pada saat analisis referensi: {e}", exc_info=True)
        return jsonify({'message': f"Terjadi kesalahan internal: {str(e)}"}), 500
    finally:
        # Selalu pastikan direktori sementara dihapus setelah selesai
        shutil.rmtree(temp_dir, ignore_errors=True)

# --- RUTE UNTUK GENERATE RPP ---
@bp.route('/generate-rpp', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_rpp_endpoint():
    """
    Endpoint untuk menghasilkan RPP berdasarkan input form dan file referensi opsional.
    """
    data = request.form
    required_fields = ['mapel', 'jenjang', 'topik', 'alokasi_waktu']
    if not all(k in data for k in required_fields):
        return jsonify({'message': 'Data input tidak lengkap.'}), 400

    file_upload = request.files.get('file')
    file_path = None
    temp_dir = None
    
    if file_upload and file_upload.filename:
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, file_upload.filename)
        file_upload.save(file_path)

    try:
        hasil_rpp = ai_service_instance.generate_rpp_from_ai(
            mapel=data['mapel'],
            jenjang=data['jenjang'],
            topik=data['topik'],
            alokasi_waktu=data['alokasi_waktu'],
            file_paths=file_path  # Kirim path file jika ada
        )
        return jsonify({'rpp': hasil_rpp})
    except Exception as e:
        current_app.logger.error(f"Error saat memanggil AI untuk RPP: {e}", exc_info=True)
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


# --- MANAJEMEN RPP (CRUD) ---
@bp.route('/rpp', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def simpan_rpp():
    data = request.get_json()
    if not data or not all(k in data for k in ['judul', 'konten_markdown', 'kelas_id']):
        return jsonify({'message': 'Data tidak lengkap'}), 400
    
    Kelas.query.get_or_404(data['kelas_id'])
    rpp_baru = RPP(
        judul=data['judul'],
        konten_markdown=data['konten_markdown'],
        kelas_id=data['kelas_id']
    )
    db.session.add(rpp_baru)
    db.session.commit()
    return jsonify({'message': f'RPP "{rpp_baru.judul}" berhasil disimpan!'}), 201

@bp.route('/rpp', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_semua_rpp():
    semua_rpp = RPP.query.order_by(RPP.tanggal_dibuat.desc()).all()
    hasil = [{
        'id': rpp.id,
        'judul': rpp.judul,
        'tanggal_dibuat': rpp.tanggal_dibuat.strftime('%d %B %Y'),
        'nama_kelas': rpp.kelas.nama_kelas
    } for rpp in semua_rpp]
    return jsonify(hasil)

@bp.route('/rpp/<int:id_rpp>', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_satu_rpp(id_rpp):
    rpp = RPP.query.get_or_404(id_rpp)
    return jsonify({
        'id': rpp.id,
        'judul': rpp.judul,
        'konten_markdown': rpp.konten_markdown,
        'nama_kelas': rpp.kelas.nama_kelas
    })

@bp.route('/rpp/<int:id_rpp>', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def delete_rpp(id_rpp):
    rpp = RPP.query.get_or_404(id_rpp)
    try:
        db.session.delete(rpp)
        db.session.commit()
        return jsonify({'message': f'RPP "{rpp.judul}" berhasil dihapus!'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saat menghapus RPP: {e}", exc_info=True)
        return jsonify({'message': 'Gagal menghapus RPP.'}), 500

@bp.route('/rpp/<int:id_rpp>/pdf', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_rpp_pdf_endpoint(id_rpp):
    # (Implementasi pembuatan PDF RPP Anda di sini...)
    # Kode ini tampaknya sudah benar, jadi bisa disalin langsung dari file lama Anda.
    pass


# --- MANAJEMEN SOAL (CRUD) ---
@bp.route('/generate-soal', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_soal_endpoint():
    data = request.get_json()
    if not data or not all(k in data for k in ['rpp_id', 'jenis_soal', 'jumlah_soal', 'taksonomi_bloom_level']):
        return jsonify({'message': 'Data input tidak lengkap.'}), 400

    rpp = RPP.query.get_or_404(data['rpp_id'])
    try:
        hasil_soal_json_str = ai_service_instance.generate_soal_from_ai(
            sumber_materi=rpp.konten_markdown,
            jenis_soal=data['jenis_soal'],
            jumlah_soal=data['jumlah_soal'],
            taksonomi_bloom_level=data['taksonomi_bloom_level']
        )
        return jsonify(pyjson.loads(hasil_soal_json_str))
    except Exception as e:
        current_app.logger.error(f"Error saat memanggil AI untuk soal: {e}", exc_info=True)
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500

@bp.route('/soal', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def simpan_soal():
    data = request.get_json()
    if not data or not all(k in data for k in ['judul', 'konten_json', 'rpp_id']):
        return jsonify({'message': 'Data tidak lengkap'}), 400
    
    RPP.query.get_or_404(data['rpp_id'])
    soal_baru = Soal(
        judul=data['judul'],
        konten_json=json.dumps(data['konten_json']),
        rpp_id=data['rpp_id']
    )
    db.session.add(soal_baru)
    db.session.commit()
    return jsonify({'message': f'Set soal "{soal_baru.judul}" berhasil disimpan!'}), 201

@bp.route('/soal', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_semua_soal():
    semua_soal = Soal.query.order_by(Soal.tanggal_dibuat.desc()).all()
    hasil = []
    for soal_set in semua_soal:
        hasil.append({
            'id': soal_set.id,
            'judul': soal_set.judul,
            'tanggal_dibuat': soal_set.tanggal_dibuat.strftime('%d %B %Y'),
            'judul_rpp': soal_set.rpp.judul
        })
    return jsonify(hasil)

@bp.route('/soal/<int:id_soal>', methods=['GET', 'DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def kelola_satu_soal(id_soal):
    soal_set = Soal.query.get_or_404(id_soal)

    if request.method == 'GET':
        konten = json.loads(soal_set.konten_json)
        return jsonify({
            'id': soal_set.id,
            'judul': soal_set.judul,
            'konten_json': konten,
            'judul_rpp': soal_set.rpp.judul
        })
    elif request.method == 'DELETE':
        try:
            db.session.delete(soal_set)
            db.session.commit()
            return jsonify({'message': f'Set soal "{soal_set.judul}" berhasil dihapus!'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error deleting soal set: {e}")
            return jsonify({'message': 'Gagal menghapus set soal.', 'details': str(e)}), 500

# --- NEW ENDPOINT: Generate Exam PDF (dengan layout, pengacakan, dan info siswa) ---
@bp.route('/generate-exam-pdf', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_exam_pdf_endpoint():
    data = request.get_json()
    exam_title = data.get('exam_title', 'Ujian')
    questions_data = data.get('questions', [])
    layout_settings = data.get('layout', {}) 

    if not questions_data:
        return jsonify({'message': 'Tidak ada soal yang diberikan untuk membuat ujian PDF.'}), 400

    # Ambil pengaturan layout dari frontend
    shuffle_questions = layout_settings.get('shuffle_questions', False)
    shuffle_answers = layout_settings.get('shuffle_answers', False)
    student_info_fields = layout_settings.get('student_info_fields', []) 

    # Pisahkan soal pilihan ganda dan esai
    mcq_questions = []
    essay_questions = []

    for q in questions_data:
        if q.get('pilihan') and isinstance(q['pilihan'], dict) and q['pilihan']:
            mcq_questions.append(q)
        elif q.get('jawaban_ideal') and (not q.get('pilihan') or (isinstance(q.get('pilihan'), dict) and not q['pilihan'])):
            essay_questions.append(q)
        else:
            current_app.logger.warning(f"Soal dengan tipe ambigu atau tidak teridentifikasi dilewati: {q}")


    # Terapkan pengacakan di dalam setiap jenis soal jika diaktifkan
    if shuffle_questions:
        random.shuffle(mcq_questions)
        random.shuffle(essay_questions)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=inch, rightMargin=inch,
                            topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()

    # Define custom styles
    styles.add(ParagraphStyle(name='TitleStyle', parent=styles['h1'],
                              fontSize=18, leading=22, spaceAfter=18, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='InfoFieldStyle', parent=styles['Normal'],
                              fontSize=10, leading=12, spaceAfter=6, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='QuestionStyle', parent=styles['Normal'],
                              fontSize=11, leading=13, spaceAfter=8, alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle(name='OptionStyle', parent=styles['Normal'],
                              fontSize=10, leading=12, spaceAfter=2, leftIndent=20))
    styles.add(ParagraphStyle(name='SectionTitleStyle', parent=styles['h2'],
                              fontSize=14, leading=16, spaceBefore=18, spaceAfter=8, alignment=TA_LEFT))

    story = []


    # Tambahkan kolom informasi siswa jika diaktifkan
    for field_label in student_info_fields:
        story.append(Paragraph(f"{field_label}: ___________________________________________", styles['InfoFieldStyle']))
    story.append(Spacer(1, 0.3 * inch)) 

    # Bagian I: Soal Pilihan Ganda
    if mcq_questions:
        story.append(Paragraph("Bagian I: Pilihan Ganda", styles['SectionTitleStyle']))
        for i, q_data in enumerate(mcq_questions):
            question_text = f"{i+1}. {q_data.get('pertanyaan', '')}"
            story.append(Paragraph(question_text, styles['QuestionStyle']))
            
            if q_data.get('pilihan') and isinstance(q_data['pilihan'], dict):
                option_values = list(q_data['pilihan'].values()) # Ambil hanya nilai opsi
                if shuffle_answers:
                    random.shuffle(option_values) # Acak hanya nilai opsi
                
                # Gunakan label A, B, C, D... tetap berurutan untuk menampilkan opsi
                option_labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] 
                for j, value in enumerate(option_values):
                    if j < len(option_labels):
                        story.append(Paragraph(f"   {option_labels[j]}. {value}", styles['OptionStyle']))
                    else:
                        # Fallback jika ada lebih banyak opsi daripada label default
                        story.append(Paragraph(f"   {chr(65 + j)}. {value}", styles['OptionStyle'])) 
            story.append(Spacer(1, 0.1 * inch))

    # Bagian II: Soal Esai
    if essay_questions:
        if mcq_questions: # Tambahkan halaman baru jika ada soal pilihan ganda sebelumnya
            story.append(PageBreak())
        story.append(Paragraph("Bagian II: Esai", styles['SectionTitleStyle']))
        for i, q_data in enumerate(essay_questions):
            question_text = f"{i+1}. {q_data.get('pertanyaan', '')}"
            story.append(Paragraph(question_text, styles['QuestionStyle']))
            story.append(Paragraph("   Jawaban: ____________________________________________________________________", styles['OptionStyle']))
            story.append(Spacer(1, 0.5 * inch)) 
        story.append(Spacer(1, 0.1 * inch))


    try:
        doc.build(story)
    except Exception as e:
        # Menangkap error dan log dengan detail
        current_app.logger.error("Error creating exam PDF: %s", str(e), exc_info=True)
        return jsonify({'message': f'Gagal membuat file PDF: {e}'}), 500

    buffer.seek(0)
    # Ini adalah respons akhir, pastikan tidak ada jsonify atau print setelah ini.
    return send_file(buffer, as_attachment=True, download_name=f"{exam_title.replace(' ', '_')}.pdf", mimetype='application/pdf')


# --- NEW ENDPOINT: Save Exam ---
@bp.route('/ujian', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def simpan_ujian():
    data = request.get_json()
    current_user_id = get_jwt_identity()

    if not data or not all(k in data for k in ['exam_title', 'questions']):
        return jsonify({'message': 'Data tidak lengkap. Pastikan judul ujian dan daftar soal terisi.'}), 400
    
    if not isinstance(data['questions'], list):
        return jsonify({'message': 'Daftar soal ujian harus berupa array.'}), 400

    pengaturan_layout = data.get('layout', {}) 

    ujian_baru = Ujian(
        judul=data['exam_title'], 
        konten_json=json.dumps(data['questions']), 
        user_id=current_user_id,
        pengaturan_layout=json.dumps(pengaturan_layout) 
    )
    db.session.add(ujian_baru)
    db.session.commit()
    return jsonify({'message': f'Ujian "{ujian_baru.judul}" berhasil disimpan!', 'id': ujian_baru.id}), 201

# --- NEW ENDPOINT: Get All Ujian ---
@bp.route('/ujian', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_semua_ujian():
    semua_ujian = Ujian.query.order_by(Ujian.tanggal_dibuat.desc()).all()
    hasil = [ujian_set.to_dict() for ujian_set in semua_ujian] 
    return jsonify(hasil)

# --- NEW ENDPOINT: Get Ujian by ID ---
@bp.route('/ujian/<int:id_ujian>', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_satu_ujian(id_ujian):
    ujian_set = Ujian.query.get_or_404(id_ujian)
    return jsonify(ujian_set.to_dict())

# --- Fungsi untuk menghapus Ujian ---
@bp.route('/ujian/<int:id_ujian>', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def delete_ujian(id_ujian):
    ujian_set = Ujian.query.get_or_404(id_ujian)
    db.session.delete(ujian_set)
    db.session.commit()
    return jsonify({'message': f'Ujian "{ujian_set.judul}" berhasil dihapus!'}), 200