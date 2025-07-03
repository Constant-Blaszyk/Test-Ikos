from pymongo import MongoClient
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def delete_entries_without_module():
    
    client = MongoClient("mongodb://10.110.6.139:27017/")  
    db = client["TestIkos"]
    test_collection = db["rapport"]

    # Compter les enregistrements supprimés
    count_deleted = 0

    # Suppression des enregistrements sans nom de module
    result = test_collection.delete_many({"scenario": None})  # Supprime tous les documents où 'module' est None
    count_deleted += result.deleted_count

    logger.info(f"Supprimé {count_deleted} enregistrements sans module.")

    # Déconnexion
    client.close()

if __name__ == "__main__":
    delete_entries_without_module()
