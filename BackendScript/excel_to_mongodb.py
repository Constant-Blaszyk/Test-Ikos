import pandas as pd
import os
import sys
from pathlib import Path

def fix_csv_headers(csv_file_path, output_file_path=None):
    """
    Corrige les en-têtes du fichier CSV selon la structure de données de formation
    
    Args:
        csv_file_path (str): Chemin vers le fichier CSV à corriger
        output_file_path (str, optional): Fichier de sortie. Si None, écrase l'original
    """
    
    # Définir les vrais noms de colonnes selon votre structure
    correct_headers = [
        'Module',                    # Colonne_1 - Ex: CTC110M, SID, DEA110
        'Formation',                 # Colonne_2 - Ex: > Gérer les comptes client
        'Description',               # Colonne_3 - Description détaillée de la tâche
        'Prérequis',                # Colonne_4 - Conditions ou prérequis
        'Date',                     # Colonne_5 - Date d'exécution
        'Type',                     # Colonne_6 - Type de formation (EDU, etc.)
        'Système',                  # Colonne_7 - Système utilisé (EVOLVE CHM, etc.)
        'Statut',                   # Colonne_8 - Statut (ok, etc.)
        'Référence',                # Colonne_9 - Référence du compte/dossier
        'Commentaires',             # Colonne_10 - Commentaires additionnels
        'Formateur'                 # Colonne_11 - Nom du formateur
    ]
    
    try:
        # Lire le fichier CSV avec les en-têtes génériques
        print(f"Lecture du fichier: {csv_file_path}")
        df = pd.read_csv(csv_file_path, sep=';', encoding='utf-8-sig')
        
        print(f"Dimensions du fichier: {df.shape[0]} lignes, {df.shape[1]} colonnes")
        print(f"En-têtes actuels: {list(df.columns)}")
        
        # Vérifier le nombre de colonnes
        if len(df.columns) != len(correct_headers):
            print(f"⚠️  Attention: {len(df.columns)} colonnes détectées, {len(correct_headers)} attendues")
            
            # Ajuster les en-têtes selon le nombre de colonnes
            if len(df.columns) < len(correct_headers):
                headers_to_use = correct_headers[:len(df.columns)]
                print(f"Utilisation des {len(headers_to_use)} premiers en-têtes")
            else:
                headers_to_use = correct_headers + [f'Colonne_Extra_{i}' for i in range(len(df.columns) - len(correct_headers))]
                print(f"Ajout d'en-têtes supplémentaires pour les colonnes excédentaires")
        else:
            headers_to_use = correct_headers
        
        # Appliquer les nouveaux en-têtes
        df.columns = headers_to_use
        
        print(f"✓ Nouveaux en-têtes appliqués: {list(df.columns)}")
        
        # Afficher un aperçu des données avec les nouveaux en-têtes
        print("\nAperçu des données avec les nouveaux en-têtes:")
        print(df.head(3).to_string(max_cols=6, max_colwidth=40))
        
        # Définir le fichier de sortie
        if output_file_path is None:
            output_file_path = csv_file_path  # Écraser l'original
        
        # Sauvegarder le fichier corrigé
        df.to_csv(output_file_path, sep=';', index=False, encoding='utf-8-sig', quoting=1)
        
        print(f"\n✓ Fichier corrigé sauvegardé: {output_file_path}")
        
        # Afficher des statistiques sur les données
        print("\n=== Statistiques des données ===")
        print(f"Nombre total de lignes: {len(df)}")
        print(f"Lignes avec module renseigné: {len(df[df['Module'].str.strip() != ''])}")
        print(f"Lignes avec formation renseignée: {len(df[df['Formation'].str.strip() != ''])}")
        
        # Compter les modules uniques
        modules_uniques = df[df['Module'].str.strip() != '']['Module'].unique()
        print(f"Modules uniques détectés: {list(modules_uniques)}")
        
        # Compter les formateurs
        formateurs = df[df['Formateur'].str.strip() != '']['Formateur'].unique()
        print(f"Formateurs: {list(formateurs)}")
        
        return df
        
    except Exception as e:
        print(f"Erreur lors de la correction: {str(e)}")
        return None

def analyze_csv_structure(csv_file_path):
    """
    Analyse la structure du fichier CSV pour comprendre les données
    """
    try:
        df = pd.read_csv(csv_file_path, sep=';', encoding='utf-8-sig')
        
        print(f"=== Analyse de la structure de: {csv_file_path} ===")
        print(f"Dimensions: {df.shape[0]} lignes, {df.shape[1]} colonnes")
        print(f"En-têtes actuels: {list(df.columns)}")
        
        print("\nPremières lignes du fichier:")
        print(df.head(5).to_string(max_cols=8, max_colwidth=30))
        
        print("\nAnalyse des colonnes:")
        for i, col in enumerate(df.columns):
            non_empty = len(df[df[col].str.strip() != '']) if df[col].dtype == 'object' else len(df[df[col].notna()])
            print(f"  {col}: {non_empty} valeurs non vides")
            
            # Afficher quelques exemples de valeurs
            sample_values = df[col].dropna().head(3).tolist()
            if sample_values:
                print(f"    Exemples: {sample_values}")
        
        # Identifier les lignes qui semblent être des en-têtes de section
        print("\nLignes avec des modules identifiés:")
        module_lines = df[df.iloc[:, 0].str.strip() != '']
        print(f"Nombre de lignes avec module: {len(module_lines)}")
        
        if len(module_lines) > 0:
            print("Modules détectés:")
            for module in module_lines.iloc[:, 0].unique():
                if module.strip():
                    print(f"  - {module}")
        
    except Exception as e:
        print(f"Erreur lors de l'analyse: {str(e)}")

def batch_fix_csv_headers(input_folder, output_folder=None):
    """
    Corrige les en-têtes de tous les fichiers CSV dans un dossier
    """
    if output_folder is None:
        output_folder = input_folder
    
    # Créer le dossier de sortie s'il n'existe pas
    os.makedirs(output_folder, exist_ok=True)
    
    csv_files = list(Path(input_folder).glob('*.csv'))
    
    if not csv_files:
        print(f"Aucun fichier CSV trouvé dans: {input_folder}")
        return
    
    print(f"Fichiers CSV trouvés: {len(csv_files)}")
    
    for csv_file in csv_files:
        print(f"\n--- Traitement de: {csv_file.name} ---")
        
        output_file = Path(output_folder) / csv_file.name
        fix_csv_headers(str(csv_file), str(output_file))
    
    print(f"\n✓ Traitement terminé! Fichiers corrigés dans: {output_folder}")

def main():
    """Fonction principale pour utiliser le script en ligne de commande"""
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python script.py <fichier_csv> [fichier_sortie]")
        print("  python script.py <fichier_csv> --analyze")
        print("  python script.py <dossier_csv> --batch [dossier_sortie]")
        print()
        print("Options:")
        print("  --analyze : Analyser la structure sans corriger")
        print("  --batch   : Traiter tous les CSV d'un dossier")
        print()
        print("Exemples:")
        print("  python script.py mon_fichier.csv")
        print("  python script.py mon_fichier.csv fichier_corrige.csv")
        print("  python script.py mon_fichier.csv --analyze")
        print("  python script.py ./csv_files/ --batch")
        return
    
    input_path = sys.argv[1]
    
    # Vérifier l'option d'analyse
    if '--analyze' in sys.argv:
        analyze_csv_structure(input_path)
        return
    
    # Vérifier l'option batch
    if '--batch' in sys.argv:
        output_folder = sys.argv[3] if len(sys.argv) > 3 else None
        batch_fix_csv_headers(input_path, output_folder)
        return
    
    # Traitement d'un seul fichier
    output_file = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    fix_csv_headers(input_path, output_file)

if __name__ == "__main__":
    # Méthode 1: Utilisation en ligne de commande
    if len(sys.argv) > 1:
        main()
    else:
        # Méthode 2: Utilisation directe
        print("=== Correcteur d'en-têtes CSV ===")
        print("Ce script corrige les en-têtes génériques (Colonne_1, Colonne_2, etc.)")
        print("et les remplace par les vrais noms de colonnes.\n")
        
        print("Utilisation en ligne de commande:")
        print("  python script.py votre_fichier.csv")
        print("  python script.py votre_fichier.csv --analyze")
        print("  python script.py ./dossier_csv/ --batch")
        print()
        
        # Pour utilisation directe, décommentez et modifiez:
        fix_csv_headers("csv\PATCH_P4.2.1.034.07052025113458_Cahier de recette, non-regression_GF.csv")
