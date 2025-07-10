# backend/app/api/ai_tools.py

import json
from flask import Blueprint, request, jsonify, current_app, send_file, after_this_request
from app.services.ai_service import AIService
from app.models.classroom_model import RPP, Kelas, Soal, Ujian 
from app import db
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
import os
import uuid
from app.api.auth import roles_required

# Import ReportLab components
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER
from reportlab.lib.units import inch 
import random 

import io 

bp = Blueprint('ai_api', __name__, url_prefix='/api')

# --- RUTE UNTUK RPP ---

@bp.route('/generate-rpp', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_rpp_endpoint():
    ai_service_instance = AIService(current_app.config['GEMINI_MODEL'])
    
    data = request.form
    
    required_fields = ['mapel', 'jenjang', 'topik', 'alokasi_waktu']
    if not all(k in data for k in required_fields):
        return jsonify({'message': 'Data input tidak lengkap. Pastikan mapel, jenjang, topik, alokasi_waktu terisi.'}), 400

    file_upload = request.files.get('file')
    
    file_path = None
    if file_upload:
        if file_upload.filename == '':
            return jsonify({"message": "Tidak ada file yang dipilih, tetapi form file ada."}), 400
        
        allowed_extensions = {'pdf', 'docx', 'txt'}
        filename_ext = file_upload.filename.rsplit('.', 1)[1].lower() if '.' in file_upload.filename else ''
        
        if filename_ext not in allowed_extensions:
            return jsonify({"message": f"Format file .{filename_ext} tidak didukung. Hanya {', '.join(allowed_extensions).upper()} yang diizinkan."}), 400
        
        temp_dir = os.path.join(os.getcwd(), 'temp_uploads')
        os.makedirs(temp_dir, exist_ok=True)
        unique_filename = str(uuid.uuid4()) + '.' + filename_ext
        file_path = os.path.join(temp_dir, unique_filename)
        
        try:
            file_upload.save(file_path)
        except Exception as e:
            return jsonify({'message': f'Gagal menyimpan file sementara: {e}'}), 500

    try:
        hasil_rpp = ai_service_instance.generate_rpp_from_ai(
            mapel=data['mapel'],
            jenjang=data['jenjang'],
            topik=data['topik'],
            alokasi_waktu=data['alokasi_waktu'],
            file_path=file_path
        )
        return jsonify({'rpp': hasil_rpp}), 200
    except Exception as e:
        print(f"Error saat memanggil AI untuk RPP: {e}")
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

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
    hasil = []
    for rpp in semua_rpp:
        hasil.append({
            'id': rpp.id,
            'judul': rpp.judul,
            'tanggal_dibuat': rpp.tanggal_dibuat.strftime('%d %B %Y'),
            'nama_kelas': rpp.kelas.nama_kelas
        })
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

@bp.route('/rpp/<int:id_rpp>/pdf', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_rpp_pdf_endpoint(id_rpp):
    rpp = RPP.query.get_or_404(id_rpp)
    rpp_title = rpp.judul
    rpp_content_markdown = rpp.konten_markdown

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            leftMargin=inch, rightMargin=inch,
                            topMargin=inch, bottomMargin=inch)
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(name='RppTitleStyle', parent=styles['h1'],
                              fontSize=18, leading=22, spaceAfter=18, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='RppHeading1', parent=styles['h1'],
                              fontSize=16, leading=18, spaceBefore=12, spaceAfter=6, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='RppHeading2', parent=styles['h2'],
                              fontSize=14, leading=16, spaceBefore=10, spaceAfter=5, alignment=TA_LEFT))
    styles.add(ParagraphStyle(name='RppNormal', parent=styles['Normal'],
                              fontSize=11, leading=13, spaceAfter=6, alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle(name='RppListItem', parent=styles['Normal'],
                              fontSize=11, leading=13, spaceAfter=3, leftIndent=20, bulletIndent=10))

    story = []
    story.append(Paragraph(rpp_title, styles['RppTitleStyle']))
    story.append(Spacer(1, 0.2 * inch))

    lines = rpp_content_markdown.split('\n')
    for line in lines:
        if line.strip().startswith('### '):
            story.append(Paragraph(line.replace('### ', ''), styles['RppHeading2']))
        elif line.strip().startswith('## '):
            story.append(Paragraph(line.replace('## ', ''), styles['RppHeading1']))
        elif line.strip().startswith('* ') or line.strip().startswith('- '):
            story.append(Paragraph(line.strip().replace('* ', '').replace('- ', ''), styles['RppListItem'], bulletText='•'))
        elif line.strip():
            story.append(Paragraph(line.strip(), styles['RppNormal']))
        else:
            story.append(Spacer(1, 0.1 * inch))

    try:
        doc.build(story)
    except Exception as e:
        print(f"Error creating RPP PDF: {e}")
        current_app.logger.error("Error creating RPP PDF", exc_info=True)
        return jsonify({'message': f'Gagal membuat file PDF RPP: {e}'}), 500

    buffer.seek(0)
    return send_file(buffer, as_attachment=True, download_name=f"{rpp_title.replace(' ', '_')}.pdf", mimetype='application/pdf')


# --- RUTE UNTUK SOAL ---

@bp.route('/generate-soal', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_soal_endpoint():
    ai_service_instance = AIService(current_app.config['GEMINI_MODEL'])
    
    data = request.get_json()
    if not data or not all(k in data for k in ['rpp_id', 'jenis_soal', 'jumlah_soal', 'taksonomi_bloom_level']):
        return jsonify({'message': 'Data input tidak lengkap. Pastikan rpp_id, jenis_soal, jumlah_soal, dan taksonomi_bloom_level terisi.'}), 400

    rpp = RPP.query.get_or_404(data['rpp_id'])
    sumber_materi = rpp.konten_markdown

    try:
        hasil_soal_json_str = ai_service_instance.generate_soal_from_ai(
            sumber_materi=sumber_materi,
            jenis_soal=data['jenis_soal'],
            jumlah_soal=data['jumlah_soal'],
            taksonomi_bloom_level=data['taksonomi_bloom_level']
        )
        return jsonify(json.loads(hasil_soal_json_str))
    except Exception as e:
        print(f"Terjadi kesalahan internal saat memanggil AI untuk membuat soal: {e}")
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

    # Terapkan pengacakan soal jika diaktifkan
    if shuffle_questions:
        random.shuffle(questions_data)

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

    # Tambahkan judul ujian
    story.append(Paragraph(exam_title, styles['TitleStyle']))
    story.append(Spacer(1, 0.2 * inch))

    # Tambahkan kolom informasi siswa jika diaktifkan
    for field_label in student_info_fields:
        story.append(Paragraph(f"{field_label}: ___________________________________________", styles['InfoFieldStyle']))
    story.append(Spacer(1, 0.3 * inch)) 

    for i, q_data in enumerate(questions_data):
        question_text = f"{i+1}. {q_data.get('pertanyaan', '')}"
        story.append(Paragraph(question_text, styles['QuestionStyle']))
        
        if q_data.get('pilihan'):
            option_items = list(q_data['pilihan'].items())
            if shuffle_answers:
                random.shuffle(option_items) 
            
            for key, value in option_items:
                story.append(Paragraph(f"   {key}. {value}", styles['OptionStyle']))
        elif q_data.get('jawaban_ideal'):
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