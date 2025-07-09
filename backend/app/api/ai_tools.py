# backend/app/api/ai_tools.py

import json
from flask import Blueprint, request, jsonify, current_app, send_file, after_this_request
from app.services.ai_service import AIService
from app.models.classroom_model import RPP, Kelas, Soal, Ujian
from app import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import uuid
from fpdf import FPDF
from app.api.auth import roles_required # <-- TAMBAHKAN BARIS INI


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

# --- NEW ENDPOINT: Generate Exam PDF (tanpa kunci jawaban & dengan pembersihan) ---
@bp.route('/generate-exam-pdf', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def generate_exam_pdf_endpoint():
    data = request.get_json()
    exam_title = data.get('exam_title', 'Ujian')
    questions_data = data.get('questions', [])

    if not questions_data:
        return jsonify({'message': 'Tidak ada soal yang diberikan untuk membuat ujian.'}), 400

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.multi_cell(0, 10, exam_title, 0, 'C')
    pdf.ln(10)

    pdf.set_font("Arial", "", 12)

    for i, q_data in enumerate(questions_data):
        pdf.set_font("Arial", "B", 12)
        question_text = f"{i+1}. {q_data.get('pertanyaan', '')}"
        pdf.multi_cell(0, 8, question_text)
        
        if q_data.get('pilihan'):
            pdf.set_font("Arial", "", 10)
            indent_options = 10
            for option_key, option_value in q_data['pilihan'].items():
                option_line = f"   {option_key}. {option_value}"
                pdf.set_x(pdf.get_x() + indent_options)
                pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - indent_options, 6, option_line)
                pdf.set_x(10)
        
        pdf.ln(5)

    temp_dir = os.path.join(current_app.root_path, 'temp_files')
    os.makedirs(temp_dir, exist_ok=True)
    
    unique_filename = f"ujian_{uuid.uuid4()}.pdf"
    output_path = os.path.join(temp_dir, unique_filename)
    
    try:
        pdf.output(output_path)
    except Exception as e:
        print(f"Error creating PDF: {e}")
        current_app.logger.error("Error creating exam PDF", exc_info=True)
        return jsonify({'message': f'Gagal membuat file PDF: {e}'}), 500

    @after_this_request
    def remove_file(response):
        try:
            os.remove(output_path)
        except Exception as e:
            current_app.logger.error(f"Error removing temporary PDF file: {e}")
        return response

    return send_file(output_path, as_attachment=True, download_name=f"{exam_title.replace(' ', '_')}.pdf", mimetype='application/pdf')

# --- NEW ENDPOINT: Save Exam ---
@bp.route('/ujian', methods=['POST'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def simpan_ujian():
    data = request.get_json()
    current_user_id = get_jwt_identity()

    if not data or not all(k in data for k in ['judul', 'konten_json']):
        return jsonify({'message': 'Data tidak lengkap. Pastikan judul dan konten_json terisi.'}), 400
    
    if not isinstance(data['konten_json'], list):
        return jsonify({'message': 'Konten ujian harus berupa daftar soal.'}), 400

    ujian_baru = Ujian(
        judul=data['judul'],
        konten_json=json.dumps(data['konten_json']),
        user_id=current_user_id
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
    hasil = []
    for ujian_set in semua_ujian:
        hasil.append({
            'id': ujian_set.id,
            'judul': ujian_set.judul,
            'tanggal_dibuat': ujian_set.tanggal_dibuat.strftime('%d %B %Y'),
            'user_id': ujian_set.user_id
        })
    return jsonify(hasil)

# --- NEW ENDPOINT: Get Ujian by ID ---
@bp.route('/ujian/<int:id_ujian>', methods=['GET'])
@jwt_required()
@roles_required(['Admin', 'Guru', 'Super User'])
def lihat_satu_ujian(id_ujian):
    ujian_set = Ujian.query.get_or_404(id_ujian)
    konten = json.loads(ujian_set.konten_json)
    return jsonify({
        'id': ujian_set.id,
        'judul': ujian_set.judul,
        'konten_json': konten,
        'tanggal_dibuat': ujian_set.tanggal_dibuat.strftime('%d %B %Y'),
        'user_id': ujian_set.user_id
    })