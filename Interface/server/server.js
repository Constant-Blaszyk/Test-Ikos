const express = require('express');
const mongoose = require('mongoose');
const { TestModel } = require('./models/TestModel');
const authRoutes = require('./routes/auth');
const cors = require('cors');
require('dotenv').config();
const moduleRoute = require('./routes/module'); // Assurez-vous que ce fichier existe
const pdfRoute = require('./routes/pdfRoute');
const reportsRoute = require('./routes/reports');
const statsRoute = require('./routes/stats');
const scenarioRoute = require('./routes/scenario'); // Assurez-vous que ce fichier existe

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Routes avec préfixes appropriés
app.use('/api/modules', moduleRoute); // Assurez-vous que ce fichier existe
app.use('/api/auth', authRoutes);
app.use('/api/pdf', pdfRoute); // Ajoutez un préfixe si nécessaire
app.use('/api/reports', reportsRoute); // Ajoutez un préfixe si nécessaire
app.use('/api/stats', statsRoute); // ✅ CORRECTION : Ajout du préfixe /api/stats
app.use('/api/modules/:moduleId', scenarioRoute); // Assurez-vous que ce fichier existe

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });




// POST /api/modules - Insérer un nouveau module
app.post('/api/modules', async (req, res) => {
  try {
    const newModule = new TestModel({
      module: req.body.module,
      formations: req.body.formations,
      nombre_formations: req.body.formations?.length || 0
    });
    await newModule.save();
    res.status(201).json(newModule);
  } catch (err) {
    res.status(500).json({ message: 'Erreur insertion', error: err.message });
  }
});

// GET /api/rapport - Liste tous les rapports
app.get('/api/rapport', async (req, res) => {
  try {
    const RapportModel = mongoose.connection.collection('rapport');
    const rapports = await RapportModel.find({}).toArray();

    const cleanRapports = rapports.map(r => ({
      ...r,
      _id: r._id?.toString(),
      date_creation: r.date_creation instanceof Date ? r.date_creation.toISOString() : r.date_creation,
      completed_at: r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at,
    }));

    res.status(200).json({ rapports: cleanRapports });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des rapports', error: err.message });
  }
});

// Route non trouvée - Mise à jour avec toutes les routes disponibles
app.use((req, res) => {
  res.status(404).json({
    message: 'Route non trouvée',
    method: req.method,
    url: req.originalUrl,
    availableRoutes: [
      'GET /api/modules/all/scenarios',
      'GET /api/modules/:moduleId/scenarios',
      'GET /api/modules/:moduleId/scenarios/:scenarioId',
      'POST /api/modules/:moduleId/scenarios',
      'PUT /api/modules/:moduleId/scenarios/:scenarioId',
      'DELETE /api/modules/:moduleId/scenarios/:scenarioId',
      'POST /api/modules',
      'GET /api/rapport',
      'GET /api/stats', // ✅ Ajout de la route stats
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Express en écoute sur http://localhost:${PORT}`);
});