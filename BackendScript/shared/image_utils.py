import pyautogui
import cv2
import numpy as np
from shared.logger import logger

def click_on_image(image_path, confidence=0.9, timeout=10):
    """
    Cherche et clique sur une image à l'écran
    
    Args:
        image_path (str): Chemin vers l'image à trouver
        confidence (float): Niveau de confiance pour la correspondance (0-1)
        timeout (int): Temps maximum d'attente en secondes
    """
    try:
        # Localise l'image à l'écran
        location = pyautogui.locateOnScreen(
            image_path,
            confidence=confidence,
            grayscale=True
        )
        
        if location:
            # Calcule le centre de l'image
            center = pyautogui.center(location)
            # Clique sur l'image
            pyautogui.click(center)
            logger.info(f"Clic réussi sur l'image: {image_path}")
            return True
        else:
            logger.error(f"Image non trouvée: {image_path}")
            return False
            
    except Exception as e:
        logger.error(f"Erreur lors du clic sur l'image {image_path}: {str(e)}")
        return False