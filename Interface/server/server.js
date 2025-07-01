const express = require('express');
const mongoose = require('mongoose');
const { TestModel } = require('./models/TestModel');
const authRoutes = require('./routes/auth');
const cors = require('cors');
require('dotenv').config();
const moduleRoute = require('./routes/module');
const pdfRoute = require('./routes/pdfRoute');
const reportsRoute = require('./routes/reports');
const statsRoute = require('./routes/stats');
const scenarioRoute = require('./routes/scenario');
const patchesRoutes = require('./routes/patch');

const app = express();

// Configuration CORS optimisée
const allowedOrigins = [
  'http://localhost:5173',
  'http://10.110.6.139:5173',
  // Ajoutez d'autres origines si nécessaire
];

app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origine (comme les requêtes locales)
    if (!origin) return callback(null, true);

    // Vérifie si l'origine est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Routes avec préfixes appropriés
app.use('/api/modules', moduleRoute);
app.use('/api/auth', authRoutes);
app.use('/api/pdf', pdfRoute);
app.use('/api/reports', reportsRoute);
app.use('/api/stats', statsRoute);
app.use('/api/modules/:moduleId', scenarioRoute);
app.use('/api/patches', patchesRoutes);

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

// Route non trouvée
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
      'GET /api/stats',
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur serveur', error: err.message });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Express en écoute sur http://0.0.0.0:${PORT}`);
  console.log(`🔗 Accès possible depuis : ${allowedOrigins.join(', ')}`);
});
