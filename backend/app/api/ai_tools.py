# backend/app/api/ai_tools.py
import json
from flask import Blueprint, request, jsonify
from app.services.ai_service import generate_rpp_from_ai, generate_soal_from_ai
from app.models.classroom_model import RPP, Kelas, Soal
from app import db

bp = Blueprint('ai_tools_api', __name__, url_prefix='/api')

# --- RUTE UNTUK RPP ---

@bp.route('/generate-rpp', methods=['POST'])
def generate_rpp_endpoint():
    data = request.form
    if not all(k in data for k in ['mapel', 'jenjang', 'topik', 'alokasi_waktu']):
        return jsonify({'message': 'Data input tidak lengkap'}), 400

    file_upload = request.files.get('file')

    try:
        hasil_rpp = generate_rpp_from_ai(
            mapel=data['mapel'],
            jenjang=data['jenjang'],
            topik=data['topik'],
            alokasi_waktu=data['alokasi_waktu'],
            file_upload=file_upload
        )
        return jsonify({'rpp': hasil_rpp})
    except Exception as e:
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500

@bp.route('/rpp', methods=['POST'])
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
def generate_soal_endpoint():
    data = request.get_json()
    if not data or not all(k in data for k in ['rpp_id', 'jenis_soal', 'jumlah_soal', 'tingkat_kesulitan']):
        return jsonify({'message': 'Data input tidak lengkap'}), 400

    rpp = RPP.query.get_or_404(data['rpp_id'])
    sumber_materi = rpp.konten_markdown

    try:
        hasil_soal_json_str = generate_soal_from_ai(
            sumber_materi=sumber_materi,
            jenis_soal=data['jenis_soal'],
            jumlah_soal=data['jumlah_soal'],
            tingkat_kesulitan=data['tingkat_kesulitan']
        )
        return jsonify(json.loads(hasil_soal_json_str))
    except Exception as e:
        return jsonify({'message': f'Terjadi kesalahan internal: {e}'}), 500

@bp.route('/soal', methods=['POST'])
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

@bp.route('/soal/<int:id_soal>', methods=['GET'])
def lihat_satu_soal(id_soal):
    soal_set = Soal.query.get_or_404(id_soal)
    konten = json.loads(soal_set.konten_json)
    return jsonify({
        'id': soal_set.id,
        'judul': soal_set.judul,
        'konten_json': konten,
        'judul_rpp': soal_set.rpp.judul
    })