const mongoose = require('mongoose');

const formationSchema = new mongoose.Schema({
  titre: String,
  description: String,
  prerequis: String,
  date: String,
  type: String,
  systeme: String,
  statut: String,
  reference: String,
  commentaires: String,
  formateur: String
});

const moduleSchema = new mongoose.Schema({
  module: {
    type: String,
    required: true
  },
  date_creation: {
    type: Date,
    default: Date.now
  },
  formations: [formationSchema],
  nombre_formations: {
    type: Number,
    default: 0
  }
});

const Module = mongoose.model('Module', moduleSchema);

module.exports = { Module };