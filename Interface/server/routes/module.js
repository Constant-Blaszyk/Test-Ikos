const express = require('express');
const { TestModel } = require('../models/TestModel');
const router = express.Router();

// GET /api/modules - Récupérer tous les modules
router.get('/', async (req, res) => {
  try {
    const modules = await TestModel.find({});
    console.log('Nombre de modules trouvés:', modules.length);
    return res.status(200).json(modules);
  } catch (err) {
    console.error('Erreur lors de la récupération:', err);
    return res.status(500).json({ 
      message: 'Erreur de récupération des modules', 
      error: err.message 
    });
  }
});

// GET /api/modules/all/scenarios - Récupérer tous les scénarios
router.get('/all/scenarios', async (req, res) => {
  try {
    const modules = await TestModel.find({});
    const allScenarios = modules.reduce((acc, module) => {
      return acc.concat(module.formations || []);
    }, []);
    return res.status(200).json(allScenarios);
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur lors de la récupération des scénarios', 
      error: err.message 
    });
  }
});

// Rechercher un module par son nom/code (champ "module")
router.get('/ref/:moduleCode', async (req, res) => {
  const code = req.params.moduleCode;
  try {
    const found = await TestModel.findOne({ module: code });
    if (!found) {
      return res.status(404).json({ success: false, message: 'Module non trouvé par code' });
    }
    return res.json({ success: true, module: found });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: e.toString() });
  }
});


// GET /api/modules/:moduleId - Récupérer un module par ID
router.get('/:moduleId', async (req, res) => {
  const moduleId = req.params.moduleId;
  
  try {
    const module = await TestModel.findById(moduleId);
    if (!module) {
      return res.status(404).json({ message: `Module "${moduleId}" introuvable` });
    }
    return res.status(200).json(module);
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur de récupération du module', 
      error: err.message 
    });
  }
});

// POST /api/modules - Créer un nouveau module (cette route existe déjà dans votre server.js)
router.post('/', async (req, res) => {
  try {
    const newModule = new TestModel({
      module: req.body.module,
      formations: req.body.formations || [],
      nombre_formations: req.body.formations?.length || 0
    });
    const savedModule = await newModule.save();
    return res.status(201).json(savedModule);
  } catch (err) {
    return res.status(400).json({ 
      message: 'Erreur lors de la création du module', 
      error: err.message 
    });
  }
});

// PUT /api/modules/:moduleId - Mettre à jour un module
router.put('/:moduleId', async (req, res) => {
  const moduleId = req.params.moduleId;
  
  try {
    const updatedModule = await TestModel.findByIdAndUpdate(
      moduleId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedModule) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    return res.status(200).json(updatedModule);
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur de mise à jour', 
      error: err.message 
    });
  }
});

// DELETE /api/modules/:moduleId - Supprimer un module
router.delete('/:moduleId', async (req, res) => {
  const moduleId = req.params.moduleId;
  
  try {
    const deletedModule = await TestModel.findByIdAndDelete(moduleId);
    if (!deletedModule) {
      return res.status(404).json({ message: 'Module introuvable' });
    }
    return res.status(200).json({ message: 'Module supprimé avec succès' });
  } catch (err) {
    return res.status(500).json({ 
      message: 'Erreur de suppression', 
      error: err.message 
    });
  }
});

// Route de test/debug
router.get('/debug/test', async (req, res) => {
  try {
    const count = await TestModel.countDocuments();
    const sampleModule = await TestModel.findOne();
    
    res.json({
      message: 'Connexion Mongoose OK',
      database: 'TestIkos',
      collection: 'TestModels',
      documentCount: count,
      sampleDocument: sampleModule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
