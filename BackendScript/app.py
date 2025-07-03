from flask import Flask, jsonify, send_file, request
from flask_cors import CORS, cross_origin
from shared.extensions import socketio
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from shared.logger import logger
from tests.CTXtest import run_ctx_test  # Add this import
from events.socket_handlers import register_socket_handlers
from bson import ObjectId
from gridfs.errors import NoFile

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.graphics.shapes import Drawing, Rect, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics import renderPDF
from datetime import datetime
import io

import time
import io
from datetime import datetime
from pymongo import MongoClient
import gridfs
import subprocess
import os
import threading

# En haut de votre fichier

_test_lock = threading.Lock()

_test_running = False

app = Flask(__name__)
socketio.init_app(
    app,
    cors_allowed_origins=["*"],
    async_mode='threading'
)



# Configuration CORS étendue
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    }
})

# Ajout d'un middleware pour tous les endpoints
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response



# --- MongoDB config ---
mongo_client = MongoClient("mongodb://10.110.6.139:27017/")
db_test = mongo_client["TestIkos"]    # Base de données pour les tests et rapports
fs = gridfs.GridFS(db_test)           # GridFS pointé vers TestIkos

# Ajout d'une fonction de vérification de la connexion
def check_mongodb_connection():
    try:
        mongo_client.server_info()
        logger.info("Connexion MongoDB établie avec succès")
        collections = db_test.list_collection_names()
        logger.info(f"Collections dans TestIkos: {collections}")
        if "rapport" not in collections:
            db_test.create_collection("rapport")
            logger.info("Collection 'rapport' créée")
        return True
    except Exception as e:
        logger.error(f"Erreur de connexion MongoDB: {str(e)}", exc_info=True)
        return False

def update_test_progress(test_id, step_info=None, status=None, progress=None):
    """Met à jour le progrès du test dans la base de données"""
    try:
        rapport_collection = db_test["rapport"]
        update_data = {"last_update": datetime.now()}
        
        if status:
            update_data["status"] = status
            
        if progress is not None:
            update_data["progress"] = progress
            
        if step_info:
            # Ajouter l'étape à la liste des étapes
            rapport_collection.update_one(
                {"test_id": test_id},
                {"$push": {"steps": step_info}, "$set": update_data}
            )
        else:
            rapport_collection.update_one(
                {"test_id": test_id},
                {"$set": update_data}
            )
            
        logger.info(f"Progression mise à jour pour {test_id}: {update_data}")
        
    except Exception as e:
        logger.error(f"Erreur lors de la mise à jour du progrès: {str(e)}", exc_info=True)

def execute_test_with_progress(test_id):
    """Exécute le test en mettant à jour la progression dans la BDD"""
    global _test_running
    
    # Vérifier si un test est déjà en cours
    with _test_lock:
        if _test_running:
            logger.warning(f"Test {test_id} annulé - un autre test est en cours")
            rapport_collection = db_test["rapport"]
            rapport_collection.update_one(
                {"test_id": test_id},
                {"$set": {
                    "status": "error",
                    "error": "Un autre test est déjà en cours d'exécution",
                    "completed_at": datetime.now()
                }}
            )
            return
        
        _test_running = True
    
    try:
        start_time = time.time()
        logger.info(f"Démarrage du test {test_id}")
        
        # Extraire module et scénario du test_id
        test_parts = test_id.split('_')
        if len(test_parts) < 2:
            raise ValueError("Format de test_id invalide")
            
        module = test_parts[0]
        scenario = '_'.join(test_parts[1:-1])  # Exclure le timestamp final
        
        # Mise à jour du statut initial
        update_test_progress(test_id, status="running", progress=0)
        
        # Simulation d'étapes avec mise à jour progressive
        steps_list = []
        
        # Étape 1: Initialisation
        update_test_progress(test_id, 
            step_info={"description": "Initialisation du test", "status": "running", "timestamp": datetime.now()},
            progress=10
        )
        time.sleep(1)
        
        # Étape 2: Lancement du navigateur
        update_test_progress(test_id,
            step_info={"description": "Lancement du navigateur", "status": "success", "timestamp": datetime.now()},
            progress=25
        )
        time.sleep(1)
        
        # Exécution du test réel
        update_test_progress(test_id, status="running", progress=50)
        steps_list = run_ctx_test(module, scenario)
        
        if not steps_list:
            raise Exception("Aucune étape de test n'a été exécutée")
        
        # Mise à jour avec les vraies étapes
        rapport_collection = db_test["rapport"]
        rapport_collection.update_one(
            {"test_id": test_id},
            {"$set": {"steps": steps_list, "progress": 90}}
        )
        
        # Génération du PDF - CORRECTION ICI
        exec_time = time.time() - start_time
        try:
            pdf_id, pdf_filename = generate_pdf(steps_list, exec_time, module, scenario, test_id)
        except Exception as pdf_error:
            logger.error(f"Erreur lors de la génération du PDF: {pdf_error}")
            pdf_id, pdf_filename = None, None
        
        # Finalisation
        success = all(step.get('status', '').lower() in ['succès', 'success', 'completed'] for step in steps_list)
        
        update_data = {
            "status": "completed" if success else "error",
            "progress": 100,
            "execution_time": exec_time,
            "success": success,
            "completed_at": datetime.now(),
            "module": module,
            "scenario": scenario
        }
        
        # Ajouter les infos PDF seulement si la génération a réussi
        if pdf_id and pdf_filename:
            update_data.update({
                "pdf_id": pdf_id,
                "filename": pdf_filename
            })
        
        rapport_collection.update_one(
            {"test_id": test_id},
            {"$set": update_data}
        )
        
        logger.info(f"Test {test_id} terminé avec succès")
        
    except Exception as e:
        logger.error(f"Erreur pendant l'exécution du test: {str(e)}", exc_info=True)
        update_test_progress(test_id, status="error", progress=0)
        rapport_collection = db_test["rapport"]
        rapport_collection.update_one(
            {"test_id": test_id},
            {"$set": {"error": str(e), "completed_at": datetime.now()}}
        )
    finally:
        # Libérer le verrou
        with _test_lock:
            _test_running = False


# 3. Amélioration de l'endpoint start-test pour éviter les doublons
@app.route('/api/start-test', methods=['POST', 'OPTIONS'])
@cross_origin()
def start_test():
    """Démarre un nouveau test"""
    global _test_running
    
    # Vérifier si un test est déjà en cours
    with _test_lock:
        if _test_running:
            return jsonify({
                "error": "Un test est déjà en cours d'exécution", 
                "status": "busy"
            }), 409  # Conflict
    
    try:
        data = request.get_json()
        module_id = data.get('moduleId')
        scenario_id = data.get('scenarioId')
        
        if not module_id or not scenario_id:
            return jsonify({"error": "moduleId et scenarioId requis"}), 400
            
        # Générer un ID unique pour ce test
        test_id = f"{module_id}_{scenario_id}_{int(time.time())}"
        
        # Vérifier si ce test_id existe déjà
        rapport_collection = db_test["rapport"]
        existing = rapport_collection.find_one({"test_id": test_id})
        if existing:
            return jsonify({
                "error": "Ce test existe déjà",
                "test_id": test_id,
                "status": existing.get("status")
            }), 409
        
        # Créer l'entrée initiale dans la base
        initial_data = {
            "test_id": test_id,
            "status": "pending",
            "progress": 0,
            "date_creation": datetime.now(),
            "steps": [],
            "module": module_id,
            "scenario": scenario_id
        }
        
        rapport_collection.insert_one(initial_data)
        
        # Lancer le test en arrière-plan
        thread = threading.Thread(target=execute_test_with_progress, args=(test_id,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "test_id": test_id,
            "status": "pending",
            "message": "Test démarré avec succès"
        })
        
    except Exception as e:
        logger.error(f"Erreur lors du démarrage du test: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Nouveau endpoint pour vérifier le statut d'un test

# 2. Correction de l'endpoint pour accepter les deux formats d'URL
@app.route('/api/test-status/<test_id>', methods=['GET', 'OPTIONS'])
@app.route('/api/test_status/<test_id>', methods=['GET', 'OPTIONS'])  # Compatibilité
@cross_origin()
def get_test_results(test_id):
    """Récupère les résultats complets d'un test"""
    try:
        logger.info(f"Requête reçue pour test_id: {test_id}")
        rapport_collection = db_test["rapport"]
        
        # Recherche par test_id (pas par _id ObjectId)
        result = rapport_collection.find_one({"test_id": test_id})
        
        if not result:
            logger.warning(f"Test non trouvé pour test_id: {test_id}")
            # Essayer aussi de chercher par ObjectId au cas où
            try:
                from bson import ObjectId
                result = rapport_collection.find_one({"_id": ObjectId(test_id)})
            except:
                pass
            
            if not result:
                return jsonify({"error": "Test non trouvé"}), 404
            
        # Conversion pour JSON
        result['_id'] = str(result['_id'])
        if result.get('pdf_id'):
            result['pdf_id'] = str(result['pdf_id'])
        if result.get('date_creation'):
            result['date_creation'] = result['date_creation'].isoformat()
        if result.get('completed_at'):
            result['completed_at'] = result['completed_at'].isoformat()
        if result.get('last_update'):
            result['last_update'] = result['last_update'].isoformat()
            
        logger.info(f"Données retournées pour {test_id}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des résultats: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/rapport', methods=['GET'])
def list_rapports():
    try:
        rapport_collection = db_test["rapport"]
        rapports = list(rapport_collection.find())
        for r in rapports:
            r['_id'] = str(r['_id'])
            if 'date_creation' in r and hasattr(r['date_creation'], 'isoformat'):
                r['date_creation'] = r['date_creation'].isoformat()
        return jsonify({"rapports": rapports})
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des rapports: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/reports/<report_id>', methods=['GET'])
def get_report_by_id(report_id):

    rapport_collection = db_test["rapport"]

    try:
        # Vérifier que l'ID est un ObjectId MongoDB valide
        if not ObjectId.is_valid(report_id):
            return jsonify({
                'error': 'ID de rapport invalide',
                'message': 'L\'ID fourni n\'est pas un ObjectId MongoDB valide'
            }), 400
        

        
        # Chercher le rapport dans la base de données
        report = rapport_collection.find_one({'_id': ObjectId(report_id)})
        
        if not report:
            return jsonify({
                'error': 'Rapport non trouvé',
                'message': f'Aucun rapport trouvé avec l\'ID {report_id}'
            }), 404
        
        # Convertir l'ObjectId en string pour la réponse JSON
        report['_id'] = str(report['_id'])
        
        # Convertir d'autres ObjectIds si nécessaire
        if 'pdf_id' in report and report['pdf_id']:
            report['pdf_id'] = str(report['pdf_id'])
        
        return jsonify(report), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Erreur serveur',
            'message': str(e)
        }), 500

# Nouveau endpoint pour télécharger un PDF par ID
@app.route('/api/download_pdf/<pdf_id>', methods=['GET'])
def download_pdf(pdf_id):
    try:
        # Récupérer le fichier PDF depuis GridFS
        file_obj = fs.get(ObjectId(pdf_id))
        return send_file(
            io.BytesIO(file_obj.read()),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=file_obj.filename
        )
    except NoFile:
        logger.error(f"PDF non trouvé dans GridFS pour l'ID: {pdf_id}")
        return jsonify({"error": "PDF non trouvé"}), 404
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement du PDF: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/download_pdf_by_filename/<filename>', methods=['GET'])
def download_pdf_by_filename(filename):
    try:
        # Chercher le fichier par son nom dans GridFS
        file_obj = fs.find_one({"filename": filename})
        if not file_obj:
            logger.error(f"PDF non trouvé dans GridFS pour le nom: {filename}")
            return jsonify({"error": "PDF non trouvé"}), 404
        return send_file(
            io.BytesIO(file_obj.read()),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=file_obj.filename
        )
    except Exception as e:
        logger.error(f"Erreur lors du téléchargement du PDF par nom: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

def start_screen_recording(output_file="test_recording.mp4"):
    cmd = [
        "ffmpeg",
        "-y",
        "-video_size", "1920x1080",  # adapte à la résolution de ta session VNC si besoin
        "-framerate", "25",
        "-f", "x11grab",
        "-i", ":10.0",               # display VNC adapté ici
        output_file
    ]
    return subprocess.Popen(cmd)

# --- PDF generation avec temps et étapes ---
def generate_pdf(steps_list, execution_time, module_name="", scenario_name="", test_id=""):
    """Génère un rapport PDF esthétique avec mise en forme optimisée"""
    
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    buffer = io.BytesIO()
    
    # Configuration du document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm,
        title="Rapport d'Automatisation de Test"
    )
    
    # Styles personnalisés optimisés
    styles = getSampleStyleSheet()
    
    # Style pour le titre principal
    styles.add(ParagraphStyle(
        name='MainTitle',
        fontSize=24,
        spaceAfter=20,
        spaceBefore=10,
        textColor=colors.HexColor("#1a365d"),
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    ))
    
    # Style pour les sous-titres (SANS BACKGROUND pour éviter superposition)
    styles.add(ParagraphStyle(
        name='SectionTitle',
        fontSize=14,
        spaceAfter=10,
        spaceBefore=15,
        textColor=colors.HexColor("#2d3748"),
        fontName='Helvetica-Bold',
        leftIndent=0
    ))
    
    # Style pour le titre des étapes
    styles.add(ParagraphStyle(
        name='StepTitle',
        fontSize=12,
        spaceAfter=5,
        spaceBefore=10,
        textColor=colors.HexColor("#2d3748"),
        fontName='Helvetica-Bold'
    ))
    
    # Style pour le contenu normal
    styles.add(ParagraphStyle(
        name='Content',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#4a5568"),
        fontName='Helvetica'
    ))
    
    # Style pour le pied de page
    styles.add(ParagraphStyle(
        name='Footer',
        fontSize=9,
        textColor=colors.HexColor("#718096"),
        alignment=TA_CENTER,
        fontName='Helvetica-Oblique'
    ))

    # Calcul des statistiques
    total_steps = len(steps_list)
    success_steps = sum(1 for step in steps_list if step.get('status', '').lower() in ['succès', 'success', 'completed'])
    error_steps = sum(1 for step in steps_list if step.get('status', '').lower() in ['échec', 'error', 'failed', 'failure'])
    warning_steps = total_steps - success_steps - error_steps
    
    success_rate = (success_steps / total_steps * 100) if total_steps > 0 else 0
    all_success = success_steps == total_steps
    
    # Construction du contenu
    story = []
    
    # Ligne décorative supérieure
    line_drawing = Drawing(400, 15)
    line_drawing.add(Line(0, 7, 400, 7, strokeColor=colors.HexColor("#4299e1"), strokeWidth=2))
    story.append(line_drawing)

    # Titre principal
    story.append(Spacer(1, 10))  # Ajoute un espace avant le titre
    story.append(Paragraph("RAPPORT D'AUTOMATISATION DE TEST", styles['MainTitle']))
    story.append(Spacer(1, 10))  # Ajoute un espace après le titre

    # Ligne décorative inférieure
    story.append(line_drawing)
    story.append(Spacer(1, 20))
    
    # Section informations générales
    story.append(Paragraph("INFORMATIONS GÉNÉRALES", styles['SectionTitle']))
    
    # Tableau des informations générales avec style simplifié
    info_data = [
        ['Date d\'exécution', timestamp],
        ['Durée totale', f"{execution_time:.2f} secondes"],
        ['Module', module_name or "Non spécifié"],
        ['Scénario', scenario_name or "Non spécifié"],
        ['ID du test', test_id or "Non spécifié"],
        ['Nombre d\'étapes', str(total_steps)]
    ]
    
    info_table = Table(info_data, colWidths=[4*cm, 8*cm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f8f9fa")),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#2d3748")),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6)
    ]))
    
    story.append(info_table)
    story.append(Spacer(1, 20))
    
    # Section résumé
    story.append(Paragraph("RÉSUMÉ EXÉCUTIF", styles['SectionTitle']))
    
    # Résumé dans un tableau simple
    if all_success:
        summary_text = "SUCCÈS COMPLET - Tous les tests ont été exécutés avec succès"
        summary_bg = colors.HexColor("#d4edda")
    else:
        summary_text = f"TESTS PARTIELS - {error_steps} échec(s) détecté(s) sur {total_steps} étapes"
        summary_bg = colors.HexColor("#f8d7da")
    
    summary_table = Table([[summary_text]], colWidths=[14*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), summary_bg),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#2d3748")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#adb5bd")),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10)
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 15))
    
    # Tableau des statistiques
    stats_data = [
        ['Type', 'Nombre', 'Pourcentage'],
        ['Succès', str(success_steps), f"{success_rate:.1f}%"],
        ['Échecs', str(error_steps), f"{(error_steps/total_steps*100):.1f}%" if total_steps > 0 else "0%"],
        ['Avertissements', str(warning_steps), f"{(warning_steps/total_steps*100):.1f}%" if total_steps > 0 else "0%"]
    ]
    
    stats_table = Table(stats_data, colWidths=[4*cm, 3*cm, 3*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#6c757d")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor("#2d3748")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        # Alternance de couleurs pour les lignes
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")])
    ]))
    
    story.append(stats_table)
    story.append(Spacer(1, 25))
    
    # Section détails des étapes avec espacement réduit
    story.append(Paragraph("DÉTAIL DES ÉTAPES", styles['SectionTitle']))
    
    for i, step in enumerate(steps_list, 1):
        status = step.get('status', 'inconnu').lower()
        description = step.get('description', f'Étape {i}')
        result = step.get('result', 'Aucun résultat disponible')
        
        # Déterminer la couleur selon le statut
        if status in ['succès', 'success', 'completed']:
            status_text = "SUCCÈS"
            status_color = colors.HexColor("#28a745")
        elif status in ['échec', 'error', 'failed', 'failure']:
            status_text = "ÉCHEC" 
            status_color = colors.HexColor("#dc3545")
        else:
            status_text = "AVERTISSEMENT"
            status_color = colors.HexColor("#ffc107")
        
        # Titre de l'étape (SANS ESPACE EXCESSIF)
        story.append(Paragraph(f"ÉTAPE {i}", styles['StepTitle']))
        
        # Contenu de l'étape dans un tableau compact
        step_data = [
            ['Description', description],
            ['Statut', status_text],
            ['Résultat', result]
        ]
        
        step_table = Table(step_data, colWidths=[3*cm, 10*cm])
        step_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor("#f8f9fa")),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor("#2d3748")),
            ('TEXTCOLOR', (1, 1), (1, 1), status_color),  # Couleur du statut
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTNAME', (1, 1), (1, 1), 'Helvetica-Bold'),  # Statut en gras
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#dee2e6")),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
        ]))
        
        story.append(step_table)
        
        # ESPACEMENT RÉDUIT entre les étapes
        if i < len(steps_list):
            story.append(Spacer(1, 8))  # Réduit de 15 à 8
        
        # Ajouter la capture d'écran si elle existe
        screenshot_path = step.get('screenshot')
        if screenshot_path and os.path.exists(screenshot_path):
            try:
                story.append(Spacer(1, 4))
                story.append(Paragraph("Capture d'écran :", styles['Content']))
                story.append(Image(screenshot_path, width=10*cm, height=6*cm))
                story.append(Spacer(1, 8))
            except Exception as img_err:
                story.append(Paragraph(f"Erreur lors de l'ajout de la capture : {img_err}", styles['Content']))
    
    # Pied de page
    story.append(Spacer(1, 25))
    story.append(Paragraph("─" * 60, styles['Footer']))
    story.append(Spacer(1, 5))
    story.append(Paragraph(f"Document généré automatiquement le {timestamp}", styles['Footer']))
    story.append(Paragraph("Système d'automatisation de tests", styles['Footer']))
    
    # Construction du PDF
    doc.build(story)
    buffer.seek(0)
    
    try:
        # Reste du code MongoDB identique...
        if not check_mongodb_connection():
            raise Exception("Impossible de se connecter à MongoDB")
        
        pdf_filename = f"rapport_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        metadata = {
            "date_creation": datetime.now(),
            "execution_time": execution_time,
            "success": all_success,
            "steps_count": total_steps,
            "success_rate": success_rate,
            "module": module_name,
            "scenario": scenario_name,
            "test_id": test_id,
            "stats": {
                "success": success_steps,
                "error": error_steps,
                "warning": warning_steps
            }
        }
        
        logger.info(f"Stockage du PDF '{pdf_filename}' dans GridFS...")
        pdf_id = fs.put(
            buffer, 
            filename=pdf_filename,
            metadata=metadata,
            content_type="application/pdf"
        )
        logger.info(f"PDF stocké avec succès. ID: {pdf_id}")
        
        rapport_collection = db_test["rapport"]
        rapport_info = {
            "test_id": test_id,
            "pdf_id": str(pdf_id),
            "filename": pdf_filename,
            "date_creation": metadata["date_creation"],
            "execution_time": metadata["execution_time"],
            "success": metadata["success"],
            "steps_count": metadata["steps_count"],
            "success_rate": metadata["success_rate"],
            "module": module_name,
            "scenario": scenario_name,
            "status": "completed",
            "stats": metadata["stats"],
            "steps": steps_list
        }
        
        result = rapport_collection.insert_one(rapport_info)
        logger.info(f"Rapport sauvegardé avec succès. ID: {result.inserted_id}")
        
        return str(pdf_id), pdf_filename
        
    except Exception as e:
        logger.error(f"Erreur lors de la génération du rapport PDF: {str(e)}", exc_info=True)
        raise Exception(f"Impossible de générer le rapport PDF: {str(e)}")

def stop_screen_recording(process):
    process.terminate()
    process.wait()

def run_test():
    print("Test en cours...")
    time.sleep(5)

# Ajouter la vérification de la connexion au démarrage
if __name__ == '__main__':
    check_mongodb_connection()
    socketio.run(
        app, 
        debug=False, 
        host='0.0.0.0', 
        port=5000, 
        use_reloader=False
    )






