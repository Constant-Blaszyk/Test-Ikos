from flask_socketio import emit
from shared.logger import logger

def emit_with_logging(event_name: str, data: dict, namespace: str = '/') -> None:
    """
    Emit a socket event with logging.
    Args:
        event_name: Name of the event to emit
        data: Data to send with the event
        namespace: Socket.IO namespace (default: '/')
    """
    try:
        logger.info(f"Emitting {event_name}: {data}")
        emit(event_name, data, namespace=namespace, broadcast=True)
    except Exception as e:
        logger.error(f"Error emitting {event_name}: {str(e)}")