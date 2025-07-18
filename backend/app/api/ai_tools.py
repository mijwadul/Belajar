# backend/app/api/ai_tools.py

import json
import os
import uuid
import tempfile
import shutil
import io
import random

from flask import Blueprint, request, jsonify, current_app, send_file, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import RPP, Soal, Ujian, Kelas, User, UserRole
from .. import db
from app.services.ai_service import AIService
from app.api.auth import roles_required

import PyPDF2
from PIL import Image
import pytesseract
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib.units import inch

bp = Blueprint('ai_api', __name__, url_prefix='/api')

# --- PERBAIKAN DIMULAI DI SINI ---

# 1. Fungsi Bantuan untuk mendapatkan instance AIService
def get_ai_service():
    """
    Membuat atau mendapatkan instance AIService untuk request saat ini.
    Ini memastikan instance hanya dibuat sekali per request dan memiliki akses
    ke konfigurasi aplikasi yang sudah aktif.
    """
    if 'ai_service' not in g:
        api_key = current_app.config.get('GEMINI_API_KEY')
        model_name = current_app.config.get('GEMINI_MODEL', 'gemini-1.5-flash')
        if not api_key:
            raise ValueError("GEMINI_API_KEY tidak ditemukan di konfigurasi aplikasi.")
        g.ai_service = AIService(api_key=api_key, model_name=model_name)
    return g.ai_service

# 2. Hapus instance global:
# baris "ai_service_instance = AIService(...)" dihapus dari sini.

# 3. Gunakan get_ai_service() di setiap endpoint
@bp.route('/analyze-referensi', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def analyze_referensi_endpoint():
    ai_service = get_ai_service() # <--- Gunakan fungsi ini
    if 'file' not in request.files:
        return jsonify({'message': 'Request harus menyertakan setidaknya satu file.'}), 400

    uploaded_files = request.files.getlist('file')

    if not uploaded_files or uploaded_files[0].filename == '':
        return jsonify({'message': 'Tidak ada file yang dipilih.'}), 400

    temp_dir = tempfile.mkdtemp()
    combined_text = ""
    bibliography = []

    try:
        for file_storage in uploaded_files:
            if file_storage and file_storage.filename:
                file_path = os.path.join(temp_dir, file_storage.filename)
                file_storage.save(file_path)
                
                extracted_text = ai_service.extract_text_from_file(file_path)
                combined_text += extracted_text + "\n\n"
                bibliography.append(file_storage.filename)

        if not combined_text.strip():
            return jsonify({'message': 'Gagal mengekstrak teks dari file atau semua file kosong.'}), 400

        analysis_result = ai_service.analyze_reference_text(combined_text)
        analysis_result['bibliografi'] = bibliography

        return jsonify(analysis_result)

    except Exception as e:
        current_app.logger.error(f"Error pada saat analisis referensi: {e}", exc_info=True)
        return jsonify({'message': f"Terjadi kesalahan internal: {str(e)}"}), 500
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

# 3. Endpoint untuk Generate RPP
@bp.route('/generate-rpp', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_rpp_endpoint():
    ai_service = get_ai_service() # <--- Gunakan fungsi ini
    data = request.form
    required_fields = ['mapel', 'jenjang', 'topik', 'alokasi_waktu']
    if not all(k in data for k in required_fields):
        return jsonify({'message': 'Data input (mapel, jenjang, topik, alokasi_waktu) tidak lengkap.'}), 400

    user_id = get_jwt_identity()
    user = User.query.get_or_404(user_id)
    
    file_uploads = request.files.getlist('file_paths')
    file_paths = []
    temp_dir = None
    
    if file_uploads:
        temp_dir = tempfile.mkdtemp()
        for file_upload in file_uploads:
            if file_upload and file_upload.filename:
                file_path = os.path.join(temp_dir, file_upload.filename)
                file_upload.save(file_path)
                file_paths.append(file_path)

    try:
        rpp_data = {
            "mapel": data.get('mapel'),
            "jenjang": data.get('jenjang'),
            "topik": data.get('topik'),
            "alokasi_waktu": data.get('alokasi_waktu'),
            "nama_penyusun": user.nama_lengkap
        }
        
        hasil_rpp = ai_service.generate_rpp_from_ai(
            rpp_data=rpp_data,
            file_paths=file_paths
        )
        return jsonify({'rpp': hasil_rpp})
    except Exception as e:
        current_app.logger.error(f"Error saat memanggil AI untuk RPP: {e}", exc_info=True)
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500
    finally:
        if temp_dir:
            shutil.rmtree(temp_dir, ignore_errors=True)


@bp.route('/rpp', methods=['POST'])
@jwt_required()
@roles_required(['Guru'])
def simpan_rpp():
    data = request.get_json()
    if not data or not all(k in data for k in ['judul', 'konten_markdown', 'kelas_id']):
        return jsonify({'message': 'Data tidak lengkap'}), 400
    
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)
    kelas = Kelas.query.get_or_404(data['kelas_id'])

    if kelas.user_id != current_user.id:
        return jsonify({'message': 'Akses ditolak: Anda hanya dapat membuat RPP untuk kelas Anda sendiri.'}), 403

    rpp_baru = RPP(
        judul=data['judul'],
        konten_markdown=data['konten_markdown'],
        kelas_id=data['kelas_id'],
        user_id=current_user.id,
        sekolah_id=current_user.sekolah_id
    )
    db.session.add(rpp_baru)
    db.session.commit()
    return jsonify({'message': f'RPP "{rpp_baru.judul}" berhasil disimpan!'}), 201

@bp.route('/rpp', methods=['GET'])
@jwt_required()
@roles_required(['Super User', 'Guru', 'Admin'])
def lihat_semua_rpp():
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)

    if current_user.role == UserRole.ADMIN:
        return jsonify([])
    elif current_user.role == UserRole.GURU:
        query = RPP.query.filter_by(user_id=current_user.id)
    else: # Super User
        query = RPP.query

    semua_rpp = query.order_by(RPP.tanggal_dibuat.desc()).all()
    hasil = [{
        'id': rpp.id,
        'judul': rpp.judul,
        'tanggal_dibuat': rpp.tanggal_dibuat.strftime('%d %B %Y'),
        'nama_kelas': rpp.kelas.nama_kelas,
        'kelas_id': rpp.kelas.id
    } for rpp in semua_rpp]
    return jsonify(hasil)

@bp.route('/rpp/<int:id_rpp>', methods=['GET'])
@jwt_required()
@roles_required(['Super User', 'Guru', 'Admin'])
def lihat_satu_rpp(id_rpp):
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)
    rpp = RPP.query.get_or_404(id_rpp)

    if current_user.role == UserRole.ADMIN:
        return jsonify({'message': 'Akses ditolak'}), 403
    if current_user.role == UserRole.GURU and rpp.user_id != current_user.id:
        return jsonify({'message': 'Anda tidak memiliki hak untuk melihat RPP ini.'}), 403

    return jsonify({
        'id': rpp.id,
        'judul': rpp.judul,
        'konten_markdown': rpp.konten_markdown,
        'nama_kelas': rpp.kelas.nama_kelas,
        'kelas_id': rpp.kelas.id
    })
    
@bp.route('/rpp/<int:id_rpp>', methods=['PUT'])
@jwt_required()
@roles_required(['Guru'])
def update_rpp(id_rpp):
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)
    rpp = RPP.query.get_or_404(id_rpp)

    if rpp.user_id != current_user.id:
        return jsonify({'message': 'Anda tidak memiliki hak untuk mengubah RPP ini.'}), 403

    data = request.get_json()
    rpp.judul = data.get('judul', rpp.judul)
    rpp.kelas_id = data.get('kelas_id', rpp.kelas_id)
    rpp.konten_markdown = data.get('konten_markdown', rpp.konten_markdown)
    
    db.session.commit()
    return jsonify({'message': 'RPP berhasil diperbarui!'}), 200

@bp.route('/rpp/<int:id_rpp>', methods=['DELETE'])
@jwt_required()
@roles_required(['Super User', 'Guru'])
def delete_rpp(id_rpp):
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)
    rpp = RPP.query.get_or_404(id_rpp)

    if current_user.role == UserRole.GURU and rpp.user_id != current_user.id:
        return jsonify({'message': 'Anda tidak memiliki hak untuk menghapus RPP ini.'}), 403
    
    try:
        db.session.delete(rpp)
        db.session.commit()
        return jsonify({'message': f'RPP "{rpp.judul}" berhasil dihapus!'}), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saat menghapus RPP: {e}", exc_info=True)
        return jsonify({'message': 'Gagal menghapus RPP.'}), 500
    
@bp.route('/rpp/<int:id_rpp>/download-pdf', methods=['GET'])
@jwt_required()
@roles_required(['Super User', 'Guru', 'Admin'])
def download_rpp_pdf(id_rpp):
    """Endpoint untuk men-download RPP sebagai file PDF dengan pemformatan Markdown."""
    user_id = int(get_jwt_identity())
    current_user = User.query.get_or_404(user_id)
    rpp = RPP.query.get_or_404(id_rpp)

    # Terapkan logika hak akses
    if current_user.role == UserRole.ADMIN:
        return jsonify({'message': 'Akses ditolak'}), 403
    if current_user.role == UserRole.GURU and rpp.user_id != current_user.id:
        return jsonify({'message': 'Anda tidak memiliki hak untuk mengunduh RPP ini.'}), 403

    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                rightMargin=inch, leftMargin=inch,
                                topMargin=inch, bottomMargin=inch)
        
        # --- PENINGKATAN STYLING DIMULAI DI SINI ---
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='H1', parent=styles['h1'], fontSize=18, leading=22, spaceAfter=12))
        styles.add(ParagraphStyle(name='H2', parent=styles['h2'], fontSize=16, leading=20, spaceAfter=10))
        styles.add(ParagraphStyle(name='H3', parent=styles['h3'], fontSize=14, leading=18, spaceAfter=8))
        styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], alignment=TA_JUSTIFY, spaceAfter=6, leading=14))
        styles.add(ParagraphStyle(name='ListItem', parent=styles['Normal'], leftIndent=20, spaceAfter=4, leading=14))

        story = []
        
        # Tambahkan judul utama dari RPP
        story.append(Paragraph(rpp.judul, styles['Title']))
        story.append(Spacer(1, 0.3 * inch))

        # Parsing konten Markdown baris per baris
        for line in rpp.konten_markdown.strip().split('\n'):
            line = line.strip()
            if line.startswith('### '):
                story.append(Paragraph(line.replace('### ', ''), styles['H3']))
            elif line.startswith('## '):
                story.append(Paragraph(line.replace('## ', ''), styles['H2']))
            elif line.startswith('# '):
                story.append(Paragraph(line.replace('# ', ''), styles['H1']))
            elif line.startswith('* '):
                # Menambahkan simbol bullet point untuk daftar
                formatted_line = f"• {line.replace('* ', '')}"
                story.append(Paragraph(formatted_line, styles['ListItem']))
            elif line: # Jika baris tidak kosong
                story.append(Paragraph(line, styles['Body']))
            else: # Jika baris kosong, tambahkan spasi
                story.append(Spacer(1, 0.1 * inch))

        doc.build(story)
        # --- AKHIR PENINGKATAN STYLING ---

        buffer.seek(0)
        safe_filename = "".join([c for c in rpp.judul if c.isalpha() or c.isdigit() or c in (' ', '-')]).rstrip()
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f'{safe_filename}.pdf',
            mimetype='application/pdf'
        )

    except Exception as e:
        current_app.logger.error(f"Gagal membuat RPP PDF: {e}", exc_info=True)
        return jsonify({'message': 'Terjadi kesalahan saat membuat file PDF.'}), 500

# 4. Endpoint untuk Generate Soal
@bp.route('/generate-soal', methods=['POST'])
@jwt_required()
@roles_required(['Guru']) # Hanya Guru yang bisa generate soal
def generate_soal_endpoint():
    data = request.get_json()
    if not data or not data.get('rpp_id'):
        return jsonify({'message': 'ID RPP wajib disertakan.'}), 400

    user_id = get_jwt_identity()
    rpp = RPP.query.get_or_404(data['rpp_id'])

    # Validasi: Guru hanya bisa generate soal dari RPP miliknya
    if rpp.user_id != user_id:
        return jsonify({'message': 'Akses ditolak: Anda hanya dapat membuat soal dari RPP Anda sendiri.'}), 403

    try:
        ai_service = get_ai_service()
        hasil_soal_json_str = ai_service.generate_soal_from_ai(
            sumber_materi=rpp.konten_markdown,
            jenis_soal=data['jenis_soal'],
            jumlah_soal=data['jumlah_soal'],
            taksonomi_bloom_level=data['taksonomi_bloom_level']
        )
        return jsonify(json.loads(hasil_soal_json_str))
    except Exception as e:
        current_app.logger.error(f"Error saat memanggil AI untuk soal: {e}", exc_info=True)
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500


@bp.route('/soal', methods=['POST'])
@jwt_required()
@roles_required(['Guru']) # Hanya Guru yang bisa menyimpan soal
def simpan_soal():
    data = request.get_json()
    if not data or not all(k in data for k in ['judul', 'konten_json', 'rpp_id']):
        return jsonify({'message': 'Data tidak lengkap'}), 400

    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)
    rpp = RPP.query.get_or_404(data['rpp_id'])

    # Validasi: Guru hanya bisa menyimpan soal yang terhubung ke RPP miliknya
    if rpp.user_id != current_user.id:
        return jsonify({'message': 'Akses ditolak: Soal harus terhubung dengan RPP Anda sendiri.'}), 403

    soal_baru = Soal(
        judul=data['judul'],
        konten_json=json.dumps(data['konten_json']),
        rpp_id=data['rpp_id'],
        user_id=current_user.id,
        sekolah_id=current_user.sekolah_id
    )
    db.session.add(soal_baru)
    db.session.commit()
    return jsonify({'message': f'Set soal "{soal_baru.judul}" berhasil disimpan!'}), 201


@bp.route('/soal', methods=['GET'])
@jwt_required()
@roles_required(['Super User', 'Guru', 'Admin'])
def lihat_semua_soal():
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)

    if current_user.role == UserRole.ADMIN:
        return jsonify([]) # Admin tidak bisa melihat soal
    elif current_user.role == UserRole.GURU:
        query = Soal.query.filter_by(user_id=current_user.id)
    else: # Super User
        query = Soal.query

    semua_soal = query.order_by(Soal.tanggal_dibuat.desc()).all()
    hasil = [{
        'id': soal_set.id,
        'judul': soal_set.judul,
        'tanggal_dibuat': soal_set.tanggal_dibuat.strftime('%d %B %Y'),
        'judul_rpp': soal_set.rpp.judul
    } for soal_set in semua_soal]
    return jsonify(hasil)


@bp.route('/soal/<int:id_soal>', methods=['GET', 'DELETE'])
@jwt_required()
@roles_required(['Super User', 'Guru', 'Admin'])
def kelola_satu_soal(id_soal):
    user_id = get_jwt_identity()
    current_user = User.query.get_or_404(user_id)
    soal_set = Soal.query.get_or_404(id_soal)

    # Validasi kepemilikan atau peran
    if current_user.role == UserRole.ADMIN:
        return jsonify({'message': 'Akses ditolak'}), 403
    if current_user.role == UserRole.GURU and soal_set.user_id != current_user.id:
        return jsonify({'message': 'Anda tidak memiliki hak untuk mengakses set soal ini.'}), 403

    # Logika untuk GET
    if request.method == 'GET':
        konten = json.loads(soal_set.konten_json)
        return jsonify({
            'id': soal_set.id,
            'judul': soal_set.judul,
            'konten_json': konten,
            'judul_rpp': soal_set.rpp.judul,
            'rpp_id': soal_set.rpp_id
        })
    
    # Logika untuk DELETE
    elif request.method == 'DELETE':
        try:
            db.session.delete(soal_set)
            db.session.commit()
            return jsonify({'message': f'Set soal "{soal_set.judul}" berhasil dihapus!'}), 200
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting soal set: {e}", exc_info=True)
            return jsonify({'message': 'Gagal menghapus set soal.'}), 500

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

    shuffle_questions = layout_settings.get('shuffle_questions', False)
    shuffle_answers = layout_settings.get('shuffle_answers', False)
    student_info_fields = layout_settings.get('student_info_fields', []) 

    mcq_questions = []
    essay_questions = []

    for q in questions_data:
        if q.get('pilihan') and isinstance(q['pilihan'], dict) and q['pilihan']:
            mcq_questions.append(q)
        elif q.get('jawaban_ideal') and (not q.get('pilihan') or (isinstance(q.get('pilihan'), dict) and not q['pilihan'])):
            essay_questions.append(q)
        else:
            current_app.logger.warning(f"Soal dengan tipe ambigu atau tidak teridentifikasi dilewati: {q}")

    if shuffle_questions:
        random.shuffle(mcq_questions)
        random.shuffle(essay_questions)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=inch, rightMargin=inch,
                            topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()

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

    for field_label in student_info_fields:
        story.append(Paragraph(f"{field_label}: ___________________________________________", styles['InfoFieldStyle']))
    story.append(Spacer(1, 0.3 * inch)) 

    if mcq_questions:
        story.append(Paragraph("Bagian I: Pilihan Ganda", styles['SectionTitleStyle']))
        for i, q_data in enumerate(mcq_questions):
            question_text = f"{i+1}. {q_data.get('pertanyaan', '')}"
            story.append(Paragraph(question_text, styles['QuestionStyle']))
            
            if q_data.get('pilihan') and isinstance(q_data['pilihan'], dict):
                option_values = list(q_data['pilihan'].values())
                if shuffle_answers:
                    random.shuffle(option_values)
                
                option_labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] 
                for j, value in enumerate(option_values):
                    if j < len(option_labels):
                        story.append(Paragraph(f"   {option_labels[j]}. {value}", styles['OptionStyle']))
                    else:
                        story.append(Paragraph(f"   {chr(65 + j)}. {value}", styles['OptionStyle'])) 
            story.append(Spacer(1, 0.1 * inch))

    if essay_questions:
        if mcq_questions:
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
        current_app.logger.error("Error creating exam PDF: %s", str(e), exc_info=True)
        return jsonify({'message': f'Gagal membuat file PDF: {e}'}), 500

    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"{exam_title.replace(' ', '_')}.pdf", mimetype='application/pdf')

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

@bp.route('/ujian', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_semua_ujian():
    semua_ujian = Ujian.query.order_by(Ujian.tanggal_dibuat.desc()).all()
    hasil = [ujian_set.to_dict() for ujian_set in semua_ujian] 
    return jsonify(hasil)

@bp.route('/ujian/<int:id_ujian>', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_satu_ujian(id_ujian):
    ujian_set = Ujian.query.get_or_404(id_ujian)
    return jsonify(ujian_set.to_dict())

@bp.route('/ujian/<int:id_ujian>', methods=['DELETE'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def delete_ujian(id_ujian):
    ujian_set = Ujian.query.get_or_404(id_ujian)
    db.session.delete(ujian_set)
    db.session.commit()
    return jsonify({'message': f'Ujian "{ujian_set.judul}" berhasil dihapus!'}), 200