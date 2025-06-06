from flask_socketio import SocketIO
from PIL import Image
import numpy as np
from skimage.metrics import structural_similarity as ssim
import cv2
from shared.logger import logger

def emit_with_logging(event, data, namespace='/'):
    """
    Émet un événement via socketio avec logging
    """
    try:
        from app import socketio
        socketio.emit(event, data, namespace=namespace)
        logger.info(f"Émission de l'événement {event}: {data}")
    except Exception as e:
        logger.error(f"Erreur lors de l'émission de l'événement {event}: {str(e)}")

def update_step_status(steps, step_index, status, result=None):
    """
    Met à jour le statut d'une étape dans la liste des étapes
    """
    if 0 <= step_index < len(steps):
        steps[step_index]["status"] = status
        if result:
            steps[step_index]["result"] = result
    else:
        logger.error(f"Index d'étape invalide: {step_index}")

def take_screenshot(driver=None):
    """
    Prend une capture d'écran et la retourne comme une image PIL
    """
    try:
        if driver:
            # Si un driver Selenium est fourni, utilise sa méthode screenshot
            screenshot = driver.get_screenshot_as_png()
            return Image.open(io.BytesIO(screenshot))
        else:
            # Sinon, utilise pyautogui pour la capture d'écran
            import pyautogui
            screenshot = pyautogui.screenshot()
            return screenshot
    except Exception as e:
        logger.error(f"Erreur lors de la capture d'écran: {str(e)}")
        return None

def images_identiques_ssim(image1, image2, seuil=0.95):
    """
    Compare deux images en utilisant l'indice de similarité structurelle (SSIM)
    Retourne True si les images sont similaires, False sinon
    """
    try:
        # Convertir les images PIL en tableaux numpy
        if isinstance(image1, Image.Image):
            img1 = np.array(image1.convert('L'))
        if isinstance(image2, Image.Image):
            img2 = np.array(image2.convert('L'))

        # Redimensionner les images si nécessaire
        if img1.shape != img2.shape:
            img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))

        # Calculer le SSIM
        score = ssim(img1, img2)
        logger.info(f"Score SSIM: {score}")
        
        return score >= seuil
    except Exception as e:
        logger.error(f"Erreur lors de la comparaison des images: {str(e)}")
        return False