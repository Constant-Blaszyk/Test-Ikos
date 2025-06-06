const http = require('http');
const url = require('url');
const mongoose = require('mongoose');
const { TestModel } = require('./models/TestModel'); // Assure-toi que ce fichier existe
require('dotenv').config();

// Utilitaires
function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => {
    console.error('❌ Erreur MongoDB:', err.message);
    process.exit(1);
  });

// Route dispatcher
const server = http.createServer(async (req, res) => {
  const { pathname, query } = url.parse(req.url, true);
  const method = req.method;

  // CORS Preflight
  if (method === 'OPTIONS') return sendJson(res, 204, {});

  // Routes
  if (method === 'GET' && pathname === '/all/scenarios') {
    try {
      const modules = await TestModel.find({});
      return sendJson(res, 200, modules);
    } catch (err) {
      return sendJson(res, 500, { message: 'Erreur', error: err.message });
    }
  }

  if (method === 'GET' && /^\/[^\/]+\/scenarios$/.test(pathname)) {
    const parts = pathname.split('/');
    const moduleId = parts[1];

    try {
      const result = await TestModel.find({ module: moduleId });
      if (!result.length) {
        return sendJson(res, 404, { message: `Aucun scénario pour le module "${moduleId}"` });
      }
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { message: 'Erreur', error: err.message });
    }
  }

  if (method === 'GET' && /^\/[^\/]+\/scenarios\/[^\/]+$/.test(pathname)) {
    const [, moduleId, , scenarioId] = pathname.split('/');
    if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
      return sendJson(res, 400, { message: 'ID scénario invalide' });
    }

    const module = await TestModel.findOne({ module: moduleId });
    if (!module) {
      const allModules = await TestModel.distinct('module');
      return sendJson(res, 404, { message: `Module "${moduleId}" introuvable`, availableModules: allModules });
    }

    const scenario = module.formations.find(f => f._id.toString() === scenarioId);
    if (!scenario) {
      return sendJson(res, 404, {
        message: 'Scénario non trouvé',
        availableScenarios: module.formations.map(f => ({
          id: f._id.toString(),
          titre: f.titre || 'Sans titre'
        }))
      });
    }

    return sendJson(res, 200, scenario);
  }

  if (method === 'POST' && /^\/[^\/]+\/scenarios$/.test(pathname)) {
    const moduleId = pathname.split('/')[1];
    const module = await TestModel.findOne({ module: moduleId });
    if (!module) return sendJson(res, 404, { message: 'Module non trouvé' });

    try {
      const data = await parseBody(req);
      module.formations.push(data);
      module.nombre_formations = module.formations.length;
      await module.save();
      return sendJson(res, 201, module.formations.at(-1));
    } catch (err) {
      return sendJson(res, 400, { message: 'Erreur JSON', error: err.message });
    }
  }

  if (method === 'PUT' && /^\/[^\/]+\/scenarios\/[^\/]+$/.test(pathname)) {
    const [, moduleId, , scenarioId] = pathname.split('/');
    if (!mongoose.Types.ObjectId.isValid(scenarioId)) return sendJson(res, 400, { message: 'ID invalide' });

    try {
      const data = await parseBody(req);
      const module = await TestModel.findOneAndUpdate(
        { module: moduleId, 'formations._id': scenarioId },
        { $set: { 'formations.$': { ...data, _id: scenarioId } } },
        { new: true }
      );

      if (!module) return sendJson(res, 404, { message: 'Scénario introuvable' });
      const updated = module.formations.find(f => f._id.toString() === scenarioId);
      return sendJson(res, 200, updated);
    } catch (err) {
      return sendJson(res, 500, { message: 'Erreur update', error: err.message });
    }
  }

  if (method === 'DELETE' && /^\/[^\/]+\/scenarios\/[^\/]+$/.test(pathname)) {
    const [, moduleId, , scenarioId] = pathname.split('/');
    if (!mongoose.Types.ObjectId.isValid(scenarioId)) return sendJson(res, 400, { message: 'ID invalide' });

    const module = await TestModel.findOneAndUpdate(
      { module: moduleId },
      { $pull: { formations: { _id: scenarioId } } },
      { new: true }
    );

    if (!module) return sendJson(res, 404, { message: 'Module ou scénario introuvable' });

    module.nombre_formations = module.formations.length;
    await module.save();
    return sendJson(res, 200, { message: 'Scénario supprimé' });
  }

  if (method === 'POST' && pathname === '/insert-scenario') {
    try {
      const body = await parseBody(req);
      const newModule = new TestModel({
        module: body.module,
        formations: body.formations,
        nombre_formations: body.formations.length
      });
      await newModule.save();
      return sendJson(res, 201, newModule);
    } catch (err) {
      return sendJson(res, 500, { message: 'Erreur insertion', error: err.message });
    }
  }

  // Route non trouvée
  return sendJson(res, 404, {
    message: 'Route non trouvée',
    method,
    url: pathname
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur natif en écoute sur http://localhost:${PORT}`);
});
