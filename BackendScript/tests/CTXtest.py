from flask import request, jsonify
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from shared.browser_utils import initialize_browser, keyboard_shortcut
from shared.utils import emit_with_logging, update_step_status, take_screenshot, images_identiques_ssim
from shared.image_utils import click_on_image
from shared.report import generate_pdf
from shared.logger import logger
from shared.extensions import socketio  # 🔄 au lieu de from app import socketio
from pymongo import MongoClient
from datetime import datetime
# from shared.video_utils import save_video_to_gridfs  # Assurez-vous que ce module/fonction existe

def save_video_to_gridfs(video_path, test_id):
    # Dummy implementation or raise NotImplementedError if not needed
    # Remove this function and related calls if you don't need video saving
    raise NotImplementedError("save_video_to_gridfs is not implemented. Please implement or remove related calls.")

import time
import subprocess
import os

_test_running = False

mongo_client = MongoClient("mongodb://localhost:27017/")
db = mongo_client["TestIkos"]
test_collection = db["test_results"]


def run_ctx_test(module, scenario, test_id=None):
    global _test_running
    if _test_running:
        logger.warning("Test already running, skipping duplicate execution")
        return [{
            "description": "Test déjà en cours",
            "status": "skipped",
            "result": "Un test est déjà en cours d'exécution"
        }]
    _test_running = True
    video_path = f"test_video_{int(time.time())}.mp4"
    recorder = start_recording(video_path)
    try:
        logger.info(f"Starting test for module: {module}, scenario: {scenario}")

        steps = [
            {"description": "Initialisation du navigateur", "status": "pending", "result": "En attente"},
            {"description": "Connexion à l'application", "status": "pending", "result": "En attente"},
            {"description": "Navigation et saisie", "status": "pending", "result": "En attente"},
            {"description": "Validation des changements", "status": "pending", "result": "En attente"},
            {"description": "Nettoyage et fermeture", "status": "pending", "result": "En attente"}
        ]

        if socketio:
            socketio.emit('steps', {'type': 'steps', 'steps': steps}, namespace='/')

        try:
            # Étape 0 - Initialisation navigateur
            emit_with_logging('step_update', {'stepIndex': 0, 'status': 'running', 'message': 'Initialisation en cours...'})
            driver = initialize_browser()
            update_step_status(steps, 0, 'completed', 'Navigateur initialisé avec succès')
            emit_with_logging('step_update', {'stepIndex': 0, 'status': 'completed', 'message': 'Navigateur initialisé avec succès'})

            # Étape 1 - Connexion
            emit_with_logging('step_update', {'stepIndex': 1, 'status': 'running'})
            driver.get("http://ikostst.maisonsetcites.local")
            time.sleep(2)
            driver.switch_to.frame("fappli")
            driver.find_element(By.NAME, "userID").send_keys("BLASZYKCO")
            driver.find_element(By.NAME, "userPWD").send_keys("Sogi24*")
            driver.find_element(By.NAME, "userPWD").send_keys(Keys.RETURN)
            update_step_status(steps, 1, 'completed', 'Connexion réussie')
            emit_with_logging('step_update', {'stepIndex': 1, 'status': 'completed'})

            # Étape 2 - Navigation et saisie
            emit_with_logging('step_update', {'stepIndex': 2, 'status': 'running'})
            time.sleep(3)
            actions = ActionChains(driver)
            actions.send_keys("COX200M").perform()
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(3)
            actions.send_keys("118218").perform()
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(8)
            
            image1 = take_screenshot()
            click_on_image("image\\boutonVoulezVous.PNG", confidence=0.8)
            time.sleep(1)
            
            # Utilisation de TAB multiple
            for _ in range(22):
                actions.send_keys(Keys.TAB).perform()
                time.sleep(0.1)  # petit délai entre chaque TAB
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(1)
            
            actions.send_keys("JUG").perform()
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(1)
            click_on_image("image\\BoutonValider.PNG", confidence=0.8)
            time.sleep(1)
            click_on_image("image\\BoutonValider.PNG", confidence=0.8)
            time.sleep(5)
            image2 = take_screenshot()
            changed = not images_identiques_ssim(image1, image2)
            update_step_status(steps, 2, 'completed', 'Navigation et saisie complètes')
            emit_with_logging('step_update', {'stepIndex': 2, 'status': 'completed'})

            # Étape 3 - Validation
            emit_with_logging('step_update', {'stepIndex': 3, 'status': 'running'})
            click_on_image("image\\boutonSelect.PNG")
            time.sleep(5)
            click_on_image("image\\boutonVoulezVous.PNG", confidence=0.8)
            time.sleep(2)
            
            # Utilisation de TAB multiple pour la validation
            for _ in range(4):
                actions.send_keys(Keys.TAB).perform()
                time.sleep(0.1)
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(2)
            click_on_image("image\\BoutonValider.PNG", confidence=0.8)
            time.sleep(2)
            click_on_image("image\\boutonRetour.PNG", confidence=0.8)
            update_step_status(steps, 3, 'completed', 'Validation des changements effectuée')
            emit_with_logging('step_update', {'stepIndex': 3, 'status': 'completed'})

            # Étape 4 - Nettoyage
            update_step_status(steps, 4, 'completed', 'Nettoyage et fermeture réussis')
            emit_with_logging('step_update', {'stepIndex': 4, 'status': 'completed'})

            pdf_path = generate_pdf(steps)
            socketio.emit('complete', {'type': 'complete', 'pdfUrl': f'/download/{pdf_path}'}, namespace='/')

            driver.quit()
            _test_running = False  # Réinitialisation après succès

            # Ajout de la sauvegarde des résultats dans MongoDB
            try:
                start_time = time.time()
                execution_time = time.time() - start_time
                result_id = save_test_results(
                    steps=steps,
                    test_id=test_id,
                    pdf_path=pdf_path,
                    execution_time=execution_time
                )
                
                logger.info(f"Test results saved to MongoDB with ID: {result_id.inserted_id}")
                
                return steps
            
            finally:
                stop_recording(recorder)  # 1. Arrêter ffmpeg proprement
                time.sleep(1)            # 2. Petite pause pour s'assurer que le fichier est flushé
                if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
                    video_id = save_video_to_gridfs(video_path, test_id)  # 3. Sauvegarder la vidéo
                    os.remove(video_path)
                else:
                    logger.error("La vidéo n'a pas été créée correctement ou est vide.")
            
        except Exception as step_error:
            logger.error(f"Erreur pendant l'exécution du test: {str(step_error)}")
            for step in steps:
                if step['status'] == 'pending':
                    step['status'] = 'error'
                    step['result'] = f"Erreur: {str(step_error)}"
            return steps

    except Exception as e:
        logger.error(f"Error in run_script: {str(e)}", exc_info=True)
        return [{
            "description": "Erreur globale",
            "status": "error",
            "result": f"Erreur: {str(e)}"
        }]


def save_test_results(steps, test_id, pdf_path, execution_time):
    """Sauvegarde les résultats du test dans MongoDB"""
    test_result = {
        "test_id": test_id,
        "execution_date": datetime.now(),
        "execution_time": execution_time,
        "pdf_path": pdf_path,
        "steps": steps,
        "status": "success" if all(step.get('status') == 'completed' for step in steps) else "failed"
    }
    return test_collection.insert_one(test_result)

def start_recording(output_path):
    return subprocess.Popen([
        'ffmpeg',
        '-y',
        '-f', 'gdigrab',
        '-framerate', '15',
        '-i', 'desktop',
        '-video_size', '1920x1080',
        '-codec:v', 'libx264',
        '-preset', 'ultrafast',
        output_path
    ], stdin=subprocess.PIPE)


def stop_recording(process):
    try:
        process.communicate(input='q'.encode(), timeout=5)
    except subprocess.TimeoutExpired:
        process.kill()
