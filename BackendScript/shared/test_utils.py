from typing import List
from shared.test_types import TestStep
from shared.logger import logger
from shared.socket_utils import emit_with_logging
import pyautogui


def update_step_status(steps: List[TestStep], index: int, status: str, result: str = None) -> None:
    """Update the status and result of a test step."""
    try:
        if 0 <= index < len(steps):
            steps[index]['status'] = status
            if result:
                steps[index]['result'] = result
            emit_with_logging('step_update', {
                'stepIndex': index,
                'status': status,
                'message': result or f'Step {index + 1} {status}'
            })
    except Exception as e:
        logger.error(f"Error updating step status: {str(e)}")


def type_text(text, interval=0.1):
    """
    Tape du texte avec un intervalle entre chaque caractère
    
    Args:
        text (str): Texte à taper
        interval (float): Délai entre chaque frappe en secondes
    """
    try:
        pyautogui.write(text, interval=interval)
        logger.info(f"Texte saisi avec succès: {text}")
        return True
    except Exception as e:
        logger.error(f"Erreur lors de la saisie du texte: {str(e)}")
        return False