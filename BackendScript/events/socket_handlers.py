from flask_socketio import SocketIO
from shared.logger import logger

def register_socket_handlers(socketio: SocketIO):
    @socketio.on('connect')
    def handle_connect():
        logger.info('Client connected')

    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info('Client disconnected')

    @socketio.on('error')
    def handle_error(error):
        logger.error(f'Socket error: {error}')