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

import time
import io
from datetime import datetime
from pymongo import MongoClient
import gridfs
import subprocess

app = Flask(__name__)
socketio.init_app(
    app,
    cors_allowed_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
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

# Nouvel endpoint pour les rapports
@app.route('/api/rapport/<test_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_rapport(test_id):
    try:
        logger.info(f"Récupération du rapport pour le test {test_id}")
        rapport_collection = db_test["rapport"]
        rapport = rapport_collection.find_one({"test_id": test_id})
        
        if not rapport:
            return jsonify({
                "error": "Rapport non trouvé",
                "test_id": test_id
            }), 404
            
        # Convertir ObjectId en str
        rapport['_id'] = str(rapport['_id'])
        
        return jsonify({
            "test_id": test_id,
            "rapport": rapport,
            "status": "success"
        })
        
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du rapport: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "test_id": test_id,
            "status": "error"
        }), 500

# --- MongoDB config ---
mongo_client = MongoClient("mongodb://localhost:27017/")
db_test = mongo_client["TestIkos"]    # Base de données pour les tests et rapports
fs = gridfs.GridFS(db_test)           # GridFS pointé vers TestIkos

# Ajout d'une fonction de vérification de la connexion
def check_mongodb_connection():
    try:
        # Vérifier la connexion
        mongo_client.server_info()
        logger.info("Connexion MongoDB établie avec succès")
        
        # Lister les collections
        collections = db_test.list_collection_names()
        logger.info(f"Collections dans TestIkos: {collections}")
        
        # Vérifier si la collection rapport existe
        if "rapport" not in collections:
            db_test.create_collection("rapport")
            logger.info("Collection 'rapport' créée")
        
        return True
    except Exception as e:
        logger.error(f"Erreur de connexion MongoDB: {str(e)}", exc_info=True)
        return False

# --- PDF generation avec temps et étapes ---
def generate_pdf(steps_list, execution_time):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=72
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Title'],
        fontSize=24,
        spaceAfter=30,
        textColor=colors.HexColor("#1a237e"),
        alignment=1
    ))
    styles.add(ParagraphStyle(
        name='StepContent',
        fontSize=11,
        leading=14,
        leftIndent=20,
        textColor=colors.HexColor("#424242")
    ))

    story = [
        Paragraph("Rapport d'Automatisation de Test", styles['MainTitle']),
        Paragraph(f"Date d'exécution : {timestamp}", styles['StepContent']),
        Paragraph(f"Durée totale du test : {execution_time:.2f} secondes", styles['StepContent']),
        Spacer(1, 20)
    ]

    all_success = all(step.get('status', '').lower() == 'succès' for step in steps_list)
    summary = "Succès complet" if all_success else "Échec détecté dans certaines étapes"
    story.append(Paragraph(f"Résumé du test : {summary}", styles['StepContent']))
    story.append(Spacer(1, 20))

    for i, step in enumerate(steps_list, 1):
        story.extend([
            Paragraph(f"Étape {i}: {step.get('description', 'Étape')}", styles['StepContent']),
            Paragraph(f"Statut: {step.get('status', 'inconnu')}", styles['StepContent']),
            Paragraph(f"Résultat: {step.get('result', 'Aucun résultat')}", styles['StepContent']),
            Spacer(1, 10)
        ])

    story.append(Spacer(1, 30))
    story.append(Paragraph(f"Document généré automatiquement le {timestamp}", styles['StepContent']))

    doc.build(story)
    buffer.seek(0)

    try:
        # Vérifier la connexion MongoDB
        if not check_mongodb_connection():
            raise Exception("Impossible de se connecter à MongoDB")

        # Stocker le PDF dans GridFS avec des métadonnées
        pdf_filename = f"rapport_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        metadata = {
            "date_creation": datetime.now(),
            "execution_time": execution_time,
            "success": all(step.get('status', '').lower() == 'succès' for step in steps_list),
            "steps_count": len(steps_list)
        }
        
        logger.info(f"Tentative de stockage du PDF '{pdf_filename}' dans GridFS")
        pdf_id = fs.put(
            buffer, 
            filename=pdf_filename,
            metadata=metadata
        )
        logger.info(f"PDF stocké avec succès dans GridFS avec l'ID: {pdf_id}")
        
        # Sauvegarder dans la collection rapport
        rapport_collection = db_test["rapport"]
        rapport_info = {
            "pdf_id": str(pdf_id),
            "filename": pdf_filename,
            "date_creation": metadata["date_creation"],
            "execution_time": metadata["execution_time"],
            "success": metadata["success"],
            "steps_count": metadata["steps_count"],
            "steps": steps_list
        }
        
        logger.info(f"Contenu du rapport à insérer: {rapport_info}")
        result = rapport_collection.insert_one(rapport_info)
        
        # Vérifier l'insertion
        inserted_doc = rapport_collection.find_one({"_id": result.inserted_id})
        if inserted_doc:
            logger.info(f"Document inséré avec succès. ID: {result.inserted_id}")
            logger.info(f"Contenu du document: {inserted_doc}")
        else:
            logger.error("Le document n'a pas été inséré correctement")
        
        return str(pdf_id), pdf_filename

    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde dans MongoDB: {str(e)}", exc_info=True)
        raise


@app.route('/api/runCTXTest', methods=['GET'])
def handle_run_ctx():
    logger.info("Starting CTX test execution")
    start_time = time.time()

    try:
        # Récupérer le testId tel quel de l'URL
        test_id = request.args.get('testId')
        if not test_id:
            return jsonify({"error": "Test ID is required"}), 400

        logger.info(f"Running new test with ID: {test_id}")
        
        # Générer un ID unique pour ce test en ajoutant un timestamp
        unique_test_id = f"{test_id}_{int(time.time())}"
        
        # Créer une nouvelle entrée pour le test
        initial_data = {
            "test_id": unique_test_id,
            "original_test_id": test_id,
            "status": "running",
            "date_creation": datetime.now(),
            "steps": []
        }
        
        # Insérer le nouveau test dans la collection
        rapport_collection = db_test["rapport"]
        rapport_collection.insert_one(initial_data)
        
        # Lancer le test en arrière-plan avec l'ID unique
        socketio.start_background_task(target=execute_test, test_id=unique_test_id)
        
        return jsonify({
            "pdf_id": None,
            "test_id": unique_test_id,
            "status": "running",
            "progress": 0,
            "message": "New test started"
        })

    except Exception as e:
        logger.error(f"Error during test execution: {str(e)}")
        return jsonify({
            "error": str(e),
            "execution_time_seconds": time.time() - start_time
        }), 500


# Ajouter le nouvel endpoint API
@app.route('/api/test-results/<test_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_test_results(test_id):
    try:
        logger.info(f"Récupération des résultats du test {test_id}")
        
        # Chercher dans la collection rapport avec test_id
        rapport_collection = db_test["rapport"]
        result = rapport_collection.find_one({"test_id": test_id})
        
        if not result:
            # Si le test n'existe pas, on le lance
            logger.info(f"Test {test_id} non trouvé, lancement du test...")
            return run_test(test_id)
            
        # Convertir ObjectId en str pour la sérialisation JSON
        result['_id'] = str(result['_id'])
        
        logger.info(f"Résultats trouvés: {result}")
        
        return jsonify({
            "test_id": test_id,
            "filename": result.get('filename'),
            "pdf_id": result.get('pdf_id'),
            "date_creation": result.get('date_creation').isoformat(),
            "execution_time": result.get('execution_time'),
            "success": result.get('success'),
            "steps_count": result.get('steps_count'),
            "steps": result.get('steps', []),
            "status": "completed"
        })

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des résultats: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "test_id": test_id,
            "status": "error"
        }), 500

def run_test(test_id):
    """Lance le test et retourne un statut en cours"""
    try:
        # Créer une entrée initiale dans la base
        rapport_collection = db_test["rapport"]
        initial_data = {
            "test_id": test_id,
            "status": "running",
            "date_creation": datetime.now(),
            "steps": []
        }
        rapport_collection.insert_one(initial_data)
        
        # Lancer le test de manière asynchrone
        socketio.start_background_task(target=execute_test, test_id=test_id)
        
        return jsonify({
            "test_id": test_id,
            "status": "running",
            "message": "Test started"
        })
        
    except Exception as e:
        logger.error(f"Erreur lors du lancement du test: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "test_id": test_id,
            "status": "error"
        }), 500

def execute_test(test_id):
    """Exécute le test en arrière-plan"""
    with app.app_context():
        try:
            start_time = time.time()
            logger.info(f"Démarrage du test Selenium pour {test_id}")
            
            # Extraire le module et le scénario du test_id
            # Format attendu: MODULE_SCENARIO_TIMESTAMP
            test_parts = test_id.split('_')
            if len(test_parts) < 3:
                raise ValueError("Format de test_id invalide")
                
            module = test_parts[0]
            scenario = '_'.join(test_parts[1:-1])  # Tout sauf le timestamp
            
            # Mise à jour du statut avant de commencer
            rapport_collection = db_test["rapport"]
            rapport_collection.update_one(
                {"test_id": test_id},
                {"$set": {"status": "running", "module": module, "scenario": scenario}}
            )
            
            # Exécuter le test Selenium
            steps_list = run_ctx_test(module, scenario)
            exec_time = time.time() - start_time
            
            if not steps_list:
                raise Exception("Aucune étape de test n'a été exécutée")
            
            # Générer et sauvegarder le PDF
            pdf_id, pdf_filename = generate_pdf(steps_list, exec_time)
            
            # Mettre à jour les informations du test
            success = all(step.get('status', '').lower() == 'succès' for step in steps_list)
            rapport_collection.update_one(
                {"test_id": test_id},
                {
                    "$set": {
                        "status": "completed" if success else "error",
                        "pdf_id": pdf_id,
                        "filename": pdf_filename,
                        "execution_time": exec_time,
                        "success": success,
                        "steps": steps_list,
                        "completed_at": datetime.now()
                    }
                }
            )
            
            logger.info(f"Test Selenium {test_id} terminé avec succès")
            
        except Exception as e:
            logger.error(f"Erreur pendant l'exécution du test Selenium: {str(e)}", exc_info=True)
            rapport_collection = db_test["rapport"]
            rapport_collection.update_one(
                {"test_id": test_id},
                {
                    "$set": {
                        "status": "error",
                        "error": str(e),
                        "completed_at": datetime.now()
                    }
                }
            )

# Ajouter ce nouvel endpoint juste avant le if __name__ == '__main__':
@app.route('/api/start-test/<test_id>', methods=['GET', 'POST', 'OPTIONS'])
@cross_origin()
def start_test(test_id):
    try:
        logger.info(f"Démarrage du test {test_id}")
        
        # Vérifier si le test existe déjà
        rapport_collection = db_test["rapport"]
        existing_test = rapport_collection.find_one({"test_id": test_id})
        
        if existing_test and existing_test.get('status') == 'running':
            logger.info(f"Test {test_id} déjà en cours d'exécution")
            return jsonify({
                "test_id": test_id,
                "status": "running",
                "message": "Test already running"
            })
        
        # Créer une nouvelle entrée pour le test
        initial_data = {
            "test_id": test_id,
            "status": "running",
            "date_creation": datetime.now(),
            "steps": []
        }
        rapport_collection.insert_one(initial_data)
        
        # Lancer le test en arrière-plan
        socketio.start_background_task(target=execute_test, test_id=test_id)
        
        return jsonify({
            "test_id": test_id,
            "status": "running",
            "message": "Test started successfully"
        })
        
    except Exception as e:
        logger.error(f"Erreur lors du démarrage du test: {str(e)}", exc_info=True)
        return jsonify({
            "error": str(e),
            "test_id": test_id,
            "status": "error"
        }), 500

# Nouveau endpoint pour vérifier le statut d'un test
@app.route('/api/test_status/<test_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_test_status(test_id):
    try:
        logger.info(f"Vérification du statut du test {test_id}")
        rapport_collection = db_test["rapport"]
        test = rapport_collection.find_one({"test_id": test_id})

        if not test:
            logger.info(f"Test {test_id} non trouvé, création automatique...")
            initial_data = {
                "test_id": test_id,
                "status": "running",
                "progress": 0,
                "date_creation": datetime.now(),
                "steps": []
            }
            rapport_collection.insert_one(initial_data)
            socketio.start_background_task(target=execute_test, test_id=test_id)
            return jsonify({
                "test_id": test_id,
                "status": "running",
                "progress": 0
            })

        # Calcul de la progression
        steps = test.get('steps', [])
        total_steps = len(steps)
        # On considère une étape terminée si status == 'succès' (pour correspondre à ta logique)
        completed_steps = len([s for s in steps if s.get('status', '').lower() == 'succès'])
        progress = int((completed_steps / total_steps) * 100) if total_steps > 0 else 0

        # Statut brut de la base
        raw_status = test.get('status', 'running')
        # On ne mappe pas ici, on garde les valeurs attendues par le front
        if raw_status not in ['running', 'completed', 'error']:
            raw_status = 'running'

        return jsonify({
            "status": raw_status,
            "progress": progress
        })

    except Exception as e:
        logger.error(f"Erreur lors de la récupération du statut: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "progress": 0
        }), 500
    

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




