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

const testModelSchema = new mongoose.Schema({
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
    default: function() {
      return this.formations.length;
    }
  }
}, { collection: 'TestsModels' }); // Explicitly set collection name

const TestModel = mongoose.model('TestModel', testModelSchema);

module.exports = { TestModel };