import pandas as pd
from pymongo import MongoClient
from datetime import datetime
import os
from pathlib import Path

def connect_mongodb(database_name="TestIkos", collection_name="TestsModels"):
    """Établit la connexion avec MongoDB"""
    try:
        client = MongoClient('mongodb://localhost:27017/')
        db = client[database_name]
        collection = db[collection_name]
        return collection
    except Exception as e:
        print(f"Erreur de connexion à MongoDB: {e}")
        return None

def clean_data(value):
    """Nettoie les données"""
    if pd.isna(value) or value is None:
        return ""
    return str(value).strip()

def csv_to_mongodb(csv_file_path):
    """Convert CSV to MongoDB documents"""
    try:
        # Utiliser Path pour gérer correctement le chemin
        file_path = Path(csv_file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Le fichier {csv_file_path} n'existe pas")
            
        print(f"Lecture du fichier: {file_path}")
        
        # Lire le fichier CSV
        df = pd.read_csv(file_path, sep=';', encoding='utf-8-sig')
        
        # Remplacer les valeurs NaN et nettoyer les données
        df = df.fillna("")
        
        # Connexion à MongoDB
        collection = connect_mongodb()
        if collection is None:
            return
        
        # Structure pour stocker les modules
        modules = {}
        
        # Parcourir les lignes du DataFrame
        current_module = None
        
        for idx, row in df.iterrows():
            # Nettoyer le module
            module_value = clean_data(row['Module'])
            
            if module_value:  # Nouveau module
                current_module = module_value
                if current_module not in modules:
                    modules[current_module] = {
                        "module": current_module,
                        "formations": []
                    }
            
            if current_module:  # Si nous sommes dans un module
                # Créer un document formation
                formation = {
                    "titre": clean_data(row['Formation']).lstrip('> '),
                    "description": clean_data(row['Description']),
                    "prerequis": clean_data(row['Prérequis']),
                    "date": clean_data(row['Date']),
                    "type": clean_data(row['Type']),
                    "systeme": clean_data(row['Système']),
                    "statut": clean_data(row['Statut']),
                    "reference": clean_data(row['Référence'])
                }
                
                # N'ajouter la formation que si elle a un titre
                if formation["titre"]:
                    modules[current_module]["formations"].append(formation)
        
        # Insérer les modules dans MongoDB
        for module_name, module_data in modules.items():
            if module_data["formations"]:  # Ne créer que les modules avec des formations
                # Ajouter des métadonnées
                module_data["date_creation"] = datetime.now()
                module_data["nombre_formations"] = len(module_data["formations"])
                
                # Insérer ou mettre à jour le document
                collection.update_one(
                    {"module": module_data["module"]},
                    {"$set": module_data},
                    upsert=True
                )
                
                print(f"Module '{module_name}' enregistré avec {module_data['nombre_formations']} formations")
        
        print("\nImportation terminée avec succès!")
        return True
        
    except Exception as e:
        print(f"Erreur lors de l'importation: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    # Utiliser Path pour gérer correctement le chemin
    csv_file = "BackendScript/csv/PATCH_P4.2.1.034.07052025113458_Cahier de recette, non-regression_PATCH_CUM.csv"
    
    # Lancer l'importation
    csv_to_mongodb(csv_file)