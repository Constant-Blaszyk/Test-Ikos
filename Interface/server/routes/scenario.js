const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();

// Configuration MongoDB
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'TestIkos'; // ← Remplacez par votre nom de DB
const COLLECTION_NAME = 'TestsModels';

// Middleware de debug
router.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - Params:`, req.params);
  next();
});

// Route de test direct MongoDB
router.get('/test/direct', async (req, res) => {
  let client;
  try {
    console.log('🔌 Connexion directe MongoDB...');
    
    // Connexion directe
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Test 1: Compter tous les documents
    const totalDocs = await collection.countDocuments();
    console.log(`📊 Total documents: ${totalDocs}`);
    
    // Test 2: Lister tous les modules
    const allDocs = await collection.find({}).toArray();
    console.log('📋 Tous les documents:');
    allDocs.forEach(doc => {
      console.log(`  - Module: ${doc.module}, ID: ${doc._id}`);
    });
    
    // Test 3: Rechercher CMD970 directement
    const cmd970 = await collection.findOne({ module: "CMD970" });
    console.log('🎯 CMD970 trouvé:', cmd970 ? 'OUI ✅' : 'NON ❌');
    
    if (cmd970) {
      console.log(`📚 Formations dans CMD970: ${cmd970.formations?.length || 0}`);
    }
    
    res.json({
      success: true,
      totalDocuments: totalDocs,
      modulesDisponibles: allDocs.map(doc => doc.module),
      cmd970Trouve: !!cmd970,
      cmd970Data: cmd970 ? {
        module: cmd970.module,
        formations: cmd970.formations,
        nombre_formations: cmd970.formations?.length || 0
      } : null
    });
    
  } catch (error) {
    console.error('❌ Erreur MongoDB direct:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur MongoDB', 
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connexion MongoDB fermée');
    }
  }
});

// Route principale avec MongoDB natif
router.get('/:moduleId/scenarios', async (req, res) => {
  let client;
  try {
    const { moduleId } = req.params;
    console.log(`🔍 Recherche scénarios pour module: ${moduleId}`);
    
    // Connexion MongoDB
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    // Recherche directe
    const moduleDoc = await collection.findOne({ module: moduleId });
    
    if (!moduleDoc) {
      console.log(`❌ Module non trouvé: ${moduleId}`);
      return res.status(404).json({ 
        success: false, 
        message: `Module ${moduleId} non trouvé` 
      });
    }
    
    console.log(`✅ Module trouvé: ${moduleDoc.module}`);
    console.log(`📚 Nombre de formations: ${moduleDoc.formations?.length || 0}`);
    
    res.json({ 
      success: true, 
      module: moduleDoc.module,
      data: moduleDoc.formations || [],
      total: moduleDoc.formations?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des scénarios:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur de récupération des scénarios', 
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Route pour module unique
router.get('/:moduleId', async (req, res) => {
  let client;
  try {
    const { moduleId } = req.params;
    console.log('🔍 Recherche module unique:', moduleId);
    
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    const moduleDoc = await collection.findOne({ module: moduleId });
    
    if (!moduleDoc) {
      console.log('❌ Module non trouvé:', moduleId);
      return res.status(404).json({ success: false, message: 'Module non trouvé' });
    }
    
    console.log('✅ Module trouvé:', moduleDoc.module);
    res.json({ success: true, data: moduleDoc });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du module:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

module.exports = router;
