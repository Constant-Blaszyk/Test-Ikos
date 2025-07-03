const mongoose = require('mongoose');

// Définir le schéma pour le scénario
const ScenarioSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: true, // Champ obligatoire
    trim: true // Supprime les espaces de début et de fin
  },
  description: {
    type: String,
    required: true, // Champ obligatoire
    trim: true // Supprime les espaces de début et de fin
  },
  PiloteProjet: {
    type: String,
    required: true, // Champ obligatoire
    trim: true // Supprime les espaces de début et de fin
  },
  statut: {
    type: String,
    enum: ['Brouillon', 'Actif', 'Inactif'], // Limite les valeurs possibles
    default: 'Brouillon' // Valeur par défaut
  },
  dateCreation: {
    type: Date,
    default: Date.now // Valeur par défaut pour la date de création
  },
  Testeur: {
    type: String,
    required: true, // Champ obligatoire
    trim: true // Supprime les espaces de début et de fin
  },
    Reference: {
    type: String,
    required: true, // Champ obligatoire
    trim: true // Supprime les espaces de début et de fin
  },
});

// Créer le modèle à partir du schéma
const ScenarioModel = mongoose.model('Scenario', ScenarioSchema);

// Exporter le modèle
module.exports = ScenarioModel;
