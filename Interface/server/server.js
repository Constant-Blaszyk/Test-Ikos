const express = require('express');
const mongoose = require('mongoose');
const { TestModel } = require('./models/TestModel');
const authRoutes = require('./routes/auth');
const cors = require('cors');
require('dotenv').config();

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
app.use('/api/auth', authRoutes);

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });

// GET /api/modules/all/scenarios - Tous les modules
app.get('/api/modules/all/scenarios', async (req, res) => {
  try {
    const modules = await TestModel.find({});
    res.status(200).json(modules);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
});

// GET /api/modules/:moduleId/scenarios - Scénarios d'un module
app.get('/api/modules/:moduleId/scenarios', async (req, res) => {
  const { moduleId } = req.params;
  try {
    const result = await TestModel.find({ module: moduleId });
    if (!result.length) {
      return res.status(404).json({ message: `Aucun scénario pour le module "${moduleId}"` });
    }
    res.status(200).json(result[0].formations || []);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
});

// GET /api/modules/:moduleId/scenarios/:scenarioId - Un scénario spécifique
app.get('/api/modules/:moduleId/scenarios/:scenarioId', async (req, res) => {
  const { moduleId, scenarioId } = req.params;
  try {
    const module = await TestModel.findOne({ module: moduleId });
    if (!module) {
      const allModules = await TestModel.distinct('module');
      return res.status(404).json({
        message: `Module "${moduleId}" introuvable`,
        availableModules: allModules
      });
    }
    let scenario;
    if (mongoose.Types.ObjectId.isValid(scenarioId)) {
      scenario = module.formations.find(f => f._id.toString() === scenarioId);
    } else {
      scenario = module.formations.find(f => f.titre === scenarioId);
    }
    if (!scenario) {
      return res.status(404).json({
        message: 'Scénario non trouvé',
        searchedFor: scenarioId,
        availableScenarios: module.formations.map(f => ({
          id: f._id?.toString(),
          titre: f.titre || 'Sans titre'
        }))
      });
    }
    res.status(200).json(scenario);
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
});

// POST /api/modules/:moduleId/scenarios - Créer un nouveau scénario
app.post('/api/modules/:moduleId/scenarios', async (req, res) => {
  const { moduleId } = req.params;
  try {
    const module = await TestModel.findOne({ module: moduleId });
    if (!module) return res.status(404).json({ message: 'Module non trouvé' });

    module.formations.push(req.body);
    module.nombre_formations = module.formations.length;
    await module.save();
    res.status(201).json(module.formations.at(-1));
  } catch (err) {
    res.status(400).json({ message: 'Erreur JSON', error: err.message });
  }
});

// PUT /api/modules/:moduleId/scenarios/:scenarioId - Modifier un scénario
app.put('/api/modules/:moduleId/scenarios/:scenarioId', async (req, res) => {
  const { moduleId, scenarioId } = req.params;
  try {
    let module;
    if (mongoose.Types.ObjectId.isValid(scenarioId)) {
      module = await TestModel.findOneAndUpdate(
        { module: moduleId, 'formations._id': scenarioId },
        { $set: { 'formations.$': { ...req.body, _id: scenarioId } } },
        { new: true }
      );
    } else {
      const moduleDoc = await TestModel.findOne({ module: moduleId });
      if (moduleDoc) {
        const formationIndex = moduleDoc.formations.findIndex(f => f.titre === scenarioId);
        if (formationIndex !== -1) {
          moduleDoc.formations[formationIndex] = { ...req.body, _id: moduleDoc.formations[formationIndex]._id };
          module = await moduleDoc.save();
        }
      }
    }
    if (!module) return res.status(404).json({ message: 'Scénario introuvable' });
    const updated = module.formations.find(f =>
      mongoose.Types.ObjectId.isValid(scenarioId)
        ? f._id.toString() === scenarioId
        : f.titre === scenarioId
    );
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Erreur update', error: err.message });
  }
});

// DELETE /api/modules/:moduleId/scenarios/:scenarioId - Supprimer un scénario
app.delete('/api/modules/:moduleId/scenarios/:scenarioId', async (req, res) => {
  const { moduleId, scenarioId } = req.params;
  try {
    let module;
    if (mongoose.Types.ObjectId.isValid(scenarioId)) {
      module = await TestModel.findOneAndUpdate(
        { module: moduleId },
        { $pull: { formations: { _id: scenarioId } } },
        { new: true }
      );
    } else {
      module = await TestModel.findOneAndUpdate(
        { module: moduleId },
        { $pull: { formations: { titre: scenarioId } } },
        { new: true }
      );
    }
    if (!module) return res.status(404).json({ message: 'Module ou scénario introuvable' });
    module.nombre_formations = module.formations.length;
    await module.save();
    res.status(200).json({ message: 'Scénario supprimé' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
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
    // Remplace "RapportModel" par ton modèle Mongoose pour les rapports si tu en as un,
    // sinon utilise directement mongoose.connection.collection('rapport')
    const RapportModel = mongoose.connection.collection('rapport');
    const rapports = await RapportModel.find({}).toArray();

    // Nettoyage des champs pour le front
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
      'POST /api/auth/login',
      'POST /api/auth/register'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Serveur Express en écoute sur http://localhost:${PORT}`);
});