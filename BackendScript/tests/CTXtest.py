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

def take_and_save_error_screenshot(driver, test_id, error_type):
    """Prend une capture d'écran et la sauvegarde avec un nom significatif"""
    try:
        # Créer le répertoire s'il n'existe pas
        os.makedirs("error_screenshots", exist_ok=True)

        # Générer un nom de fichier unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"error_screenshots/{test_id}_{error_type}_{timestamp}.png"

        # Prendre la capture d'écran
        screenshot = take_screenshot()
        screenshot.save(filename)

        logger.info(f"Capture d'erreur sauvegardée: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Erreur lors de la sauvegarde de la capture d'écran: {str(e)}")
        return None
def save_video_to_gridfs(video_path, test_id):
    # Dummy implementation or raise NotImplementedError if not needed
    # Remove this function and related calls if you don't need video saving
    raise NotImplementedError("save_video_to_gridfs is not implemented. Please implement or remove related calls.")

import time
import subprocess
import os

_test_running = False

mongo_client = MongoClient("mongodb://10.110.6.139:27017/")
db = mongo_client["TestIkos"]
test_collection = db["test_results"]

def clean_duplicate_tests():
    """Supprime les doublons basés sur la durée d'exécution et le titre/scénario"""
    count_deleted = 0
    
    try:
        # 1. Suppression des enregistrements sans nom de module (comme avant)
        result = test_collection.delete_many({"scenario": None})
        count_deleted += result.deleted_count
        logger.info(f"Supprimé {count_deleted} enregistrements sans module.")
        
        # 2. Suppression des doublons basés sur durée ET titre
        pipeline = [
            {
                "$group": {
                    "_id": {
                        "scenario": "$scenario",
                        "execution_time": "$execution_time",
                        "module": "$module"  # Ajout du module pour plus de précision
                    },
                    "docs": {"$push": "$$ROOT"},
                    "count": {"$sum": 1}
                }
            },
            {
                "$match": {
                    "count": {"$gt": 1}
                }
            }
        ]
        
        # Trouve tous les groupes de doublons
        duplicates = list(test_collection.aggregate(pipeline))
        
        duplicates_deleted = 0
        for duplicate_group in duplicates:
            docs = duplicate_group["docs"]
            # Garde le plus récent (basé sur execution_date) et supprime les autres
            docs_sorted = sorted(docs, key=lambda x: x.get("execution_date", datetime.min), reverse=True)
            docs_to_delete = docs_sorted[1:]  # Tous sauf le plus récent
            
            for doc in docs_to_delete:
                test_collection.delete_one({"_id": doc["_id"]})
                duplicates_deleted += 1
        
        logger.info(f"Supprimé {duplicates_deleted} doublons basés sur durée et titre.")
        count_deleted += duplicates_deleted
        
        # 3. Alternative plus simple : suppression basée uniquement sur durée d'exécution identique
        # (décommentez cette section si vous préférez cette approche)
        """
        # Trouve les documents avec des durées d'exécution identiques
        pipeline_simple = [
            {
                "$group": {
                    "_id": "$execution_time",
                    "docs": {"$push": "$$ROOT"},
                    "count": {"$sum": 1}
                }
            },
            {
                "$match": {
                    "count": {"$gt": 1}
                }
            }
        ]
        
        time_duplicates = list(test_collection.aggregate(pipeline_simple))
        
        for duplicate_group in time_duplicates:
            docs = duplicate_group["docs"]
            # Garde le plus récent
            docs_sorted = sorted(docs, key=lambda x: x.get("execution_date", datetime.min), reverse=True)
            docs_to_delete = docs_sorted[1:]
            
            for doc in docs_to_delete:
                test_collection.delete_one({"_id": doc["_id"]})
                count_deleted += 1
        """
        
        logger.info(f"Total supprimé: {count_deleted} enregistrements.")
        
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage des doublons: {str(e)}")
    
    finally:
        # Déconnexion
        mongo_client.close()

def check_for_errors(driver):
    """Vérifie si le mot 'erreur' apparaît dans la page"""
    try:
        # Vérifier dans le corps de la page
        page_text = driver.find_element(By.TAG_NAME, 'body').text.lower()
        if 'erreur' in page_text:
            return True

        # Vérifier aussi dans les éléments spécifiques qui pourraient contenir des messages d'erreur
        error_elements = driver.find_elements(By.XPATH, "//*[contains(translate(text(), 'ERREUR', 'erreur'), 'erreur')]")
        return len(error_elements) > 0

    except Exception as e:
        logger.error(f"Erreur lors de la vérification des erreurs: {str(e)}")
        return False




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
    error_screenshots = []

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

            # Vérification d'erreurs après étape 0
            if check_for_errors(driver):
                steps[0]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "init_error")
                raise Exception("Erreur détectée dans la page après initialisation navigateur")

            # Étape 1 - Connexion
            emit_with_logging('step_update', {'stepIndex': 1, 'status': 'running'})
            driver.get("http://ikostst.maisonsetcites.local")
            time.sleep(2)
            driver.switch_to.frame("fappli")
            driver.find_element(By.NAME, "userID").send_keys("BLASZYKCO")
            driver.find_element(By.NAME, "userPWD").send_keys("7WLv7ldBaLnvrpq")
            driver.find_element(By.NAME, "userPWD").send_keys(Keys.RETURN)
            update_step_status(steps, 1, 'completed', 'Connexion réussie')
            emit_with_logging('step_update', {'stepIndex': 1, 'status': 'completed'})

            # Vérification d'erreurs après étape 1
            if check_for_errors(driver):
                steps[1]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "login_error")
                raise Exception("Erreur détectée dans la page après connexion")

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

            # Vérification d'erreurs après étape 2 (avant screenshot)
            if check_for_errors(driver):
                steps[2]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "navigation_error")
                raise Exception("Erreur détectée dans la page après navigation et saisie")

            image1 = take_screenshot()
            click_on_image("image\\boutonVoulezVous.PNG", confidence=0.8)
            time.sleep(1)

            for _ in range(22):
                actions.send_keys(Keys.TAB).perform()
                time.sleep(0.1)
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(1)

            actions.send_keys("JUG").perform()
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(2)
            click_on_image("image\\BoutonValider.PNG", confidence=0.8)
            time.sleep(2)
            click_on_image("image\\BoutonValider.PNG", confidence=0.8)
            time.sleep(10)
            image2 = take_screenshot()
            changed = not images_identiques_ssim(image1, image2)
            update_step_status(steps, 2, 'completed', 'Navigation et saisie complètes')
            emit_with_logging('step_update', {'stepIndex': 2, 'status': 'completed'})

            # Vérification d'erreurs après étape 2 (après actions)
            if check_for_errors(driver):
                steps[2]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "navigation_post_action_error")
                raise Exception("Erreur détectée dans la page après navigation et saisie (post actions)")

            # Étape 3 - Validation
            emit_with_logging('step_update', {'stepIndex': 3, 'status': 'running'})
            click_on_image("image\\boutonSelect.PNG")
            time.sleep(10)
            click_on_image("image\\boutonVoulezVous.PNG", confidence=0.8)
            time.sleep(5)

            # Vérification d'erreurs après étape 3 (avant TAB)
            if check_for_errors(driver):
                steps[3]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "validation_error")
                raise Exception("Erreur détectée dans la page après validation (avant TAB)")

            for _ in range(4):
                actions.send_keys(Keys.TAB).perform()
                time.sleep(0.1)
            actions.send_keys(Keys.RETURN).perform()
            time.sleep(5)
            click_on_image("image\\BoutonValider.PNG", confidence=0.8)
            time.sleep(5)
            click_on_image("image\\boutonRetour.PNG", confidence=0.8)
            time.sleep(2)

            # Vérification d'erreurs après étape 3 (après actions)
            if check_for_errors(driver):
                steps[3]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "validation_post_action_error")
                raise Exception("Erreur détectée dans la page après validation (post actions)")

            update_step_status(steps, 3, 'completed', 'Validation des changements effectuée')
            emit_with_logging('step_update', {'stepIndex': 3, 'status': 'completed'})

            # Étape 4 - Nettoyage
            update_step_status(steps, 4, 'completed', 'Nettoyage et fermeture réussis')
            emit_with_logging('step_update', {'stepIndex': 4, 'status': 'completed'})

            # Vérification d'erreurs après étape 4
            if check_for_errors(driver):
                steps[4]['screenshot'] = take_and_save_error_screenshot(driver, test_id, "cleanup_error")
                raise Exception("Erreur détectée dans la page après nettoyage et fermeture")

            pdf_path = generate_pdf(steps)
            socketio.emit('complete', {'type': 'complete', 'pdfUrl': f'/download/{pdf_path}'}, namespace='/')

            driver.quit()
            _test_running = False

            try:
                start_time = time.time()
                execution_time = time.time() - start_time
                result_id = save_test_results(
                    module=module,
                    scenario=scenario,
                    steps=steps,
                    test_id=test_id,
                    pdf_path=pdf_path,
                    execution_time=execution_time
                )
                logger.info(f"Test results saved to MongoDB with ID: {result_id.inserted_id}")
                clean_duplicate_tests()
                time.sleep(1)
                return steps
            finally:
                stop_recording(recorder)
                time.sleep(1)
                if os.path.exists(video_path) and os.path.getsize(video_path) > 0:
                    video_id = save_video_to_gridfs(video_path, test_id)
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
    
def capture_specific_element(driver, element_identifier, filename_prefix):
    """Capture un élément spécifique de la page"""
    try:
        element = driver.find_element(By.CSS_SELECTOR, element_identifier)
        element.screenshot(f"element_screenshots/{filename_prefix}_{int(time.time())}.png")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la capture de l'élément: {str(e)}")
        return False



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
