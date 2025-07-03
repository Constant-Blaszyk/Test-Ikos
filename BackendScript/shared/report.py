from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
import os
from datetime import datetime
from shared.logger import logger

def generate_pdf(steps):
    """
    Génère un rapport PDF à partir des étapes du test
    
    Args:
        steps (list): Liste des étapes avec leur statut et résultat
    
    Returns:
        str: Chemin vers le fichier PDF généré
    """
    try:
        # Créer le dossier reports s'il n'existe pas
        reports_dir = "reports"
        if not os.path.exists(reports_dir):
            os.makedirs(reports_dir)

        # Générer un nom de fichier unique avec la date et l'heure
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"report_{timestamp}.pdf"
        filepath = os.path.join(reports_dir, filename)

        # Créer le document PDF
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Ajouter un titre
        title = Paragraph("Rapport d'exécution du test", styles['Heading1'])
        elements.append(title)

        # Préparer les données pour le tableau
        data = [["Étape", "Statut", "Résultat"]]
        for step in steps:
            data.append([
                step["description"],
                step["status"],
                step["result"]
            ])

        # Créer le tableau
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        
        # Générer le PDF
        doc.build(elements)
        logger.info(f"PDF généré avec succès: {filepath}")
        
        return filename

    except Exception as e:
        logger.error(f"Erreur lors de la génération du PDF: {str(e)}")
        return None