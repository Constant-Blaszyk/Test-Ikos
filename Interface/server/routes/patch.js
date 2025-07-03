const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const router = express.Router();

// Connexion MongoDB (ajustez selon votre configuration)
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'TestIkos'; // ou votre nom de base de données
const collectionName = 'patches';

// GET /api/patches - Récupérer tous les patches
router.get('/', async (req, res) => {
  let client;
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const patches = await collection.find({}).sort({ dateImport: -1 }).toArray();
    console.log('Nombre de patches trouvés:', patches.length);
    
    return res.status(200).json({ 
      patches,
      total: patches.length 
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des patches:', err);
    return res.status(500).json({ 
      message: 'Erreur de récupération des patches', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// GET /api/patches/stats - Récupérer les statistiques des patches
router.get('/stats', async (req, res) => {
  let client;
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const patches = await collection.find({}).toArray();
    
    // Calculer les statistiques
    const stats = {
      total: patches.length,
      byTechno: {},
      byModule: {}
    };

    patches.forEach(patch => {
      // Statistiques par technologie
      if (patch.techno) {
        stats.byTechno[patch.techno] = (stats.byTechno[patch.techno] || 0) + 1;
      }
      
      // Statistiques par module
      if (patch.module) {
        stats.byModule[patch.module] = (stats.byModule[patch.module] || 0) + 1;
      }
    });

    return res.status(200).json(stats);
  } catch (err) {
    console.error('Erreur lors du calcul des statistiques:', err);
    return res.status(500).json({ 
      message: 'Erreur lors du calcul des statistiques', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// GET /api/patches/search - Rechercher des patches
router.get('/search', async (req, res) => {
  let client;
  try {
    const { term, techno, module } = req.query;
    
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    // Construire la requête de recherche
    let query = {};
    
    if (term) {
      query.$or = [
        { numeroPatch: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { nomTraitement: { $regex: term, $options: 'i' } },
        { module: { $regex: term, $options: 'i' } }
      ];
    }
    
    if (techno && techno !== 'all') {
      query.techno = techno;
    }
    
    if (module && module !== 'all') {
      query.module = module;
    }
    
    const patches = await collection.find(query).sort({ dateImport: -1 }).toArray();
    
    return res.status(200).json({ 
      patches,
      total: patches.length 
    });
  } catch (err) {
    console.error('Erreur lors de la recherche:', err);
    return res.status(500).json({ 
      message: 'Erreur lors de la recherche', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// GET /api/patches/ref/:numeroPatch - Rechercher un patch par son numéro
router.get('/ref/:numeroPatch', async (req, res) => {
  let client;
  try {
    const numeroPatch = req.params.numeroPatch;
    
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const patch = await collection.findOne({ numeroPatch: numeroPatch });
    
    if (!patch) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patch non trouvé par numéro' 
      });
    }
    
    return res.json({ success: true, patch: patch });
  } catch (err) {
    console.error('Erreur lors de la recherche par numéro:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// GET /api/patches/:patchId - Récupérer un patch par ID
router.get('/:patchId', async (req, res) => {
  let client;
  try {
    const patchId = req.params.patchId;
    
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const patch = await collection.findOne({ _id: new ObjectId(patchId) });
    
    if (!patch) {
      return res.status(404).json({ 
        message: `Patch "${patchId}" introuvable` 
      });
    }
    
    return res.status(200).json(patch);
  } catch (err) {
    console.error('Erreur lors de la récupération du patch:', err);
    return res.status(500).json({ 
      message: 'Erreur de récupération du patch', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// POST /api/patches - Créer un nouveau patch
router.post('/', async (req, res) => {
  let client;
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const newPatch = {
      ...req.body,
      dateImport: new Date()
    };
    
    const result = await collection.insertOne(newPatch);
    
    return res.status(201).json({
      _id: result.insertedId,
      ...newPatch
    });
  } catch (err) {
    console.error('Erreur lors de la création du patch:', err);
    return res.status(400).json({ 
      message: 'Erreur lors de la création du patch', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// POST /api/patches/import - Importer des patches depuis Excel
// POST /api/patches/import - Version corrigée
router.post('/import', async (req, res) => {
  let client;
  try {
    console.log('🚀 Début de l\'import...');
    const patches = req.body.patches;
    
    if (!patches || !Array.isArray(patches)) {
      return res.status(400).json({ 
        success: false,
        error: 'Format de données invalide' 
      });
    }

    console.log('📊 Nombre de patches à importer:', patches.length);

    client = new MongoClient(mongoUrl);
    await client.connect();
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    let importedCount = 0;
    let duplicateCount = 0;

    for (const patchData of patches) {
      try {
        // Validation des données
        if (!patchData.datePatchCumulatif || !patchData.numeroPatchCumulatif) {
          console.warn('⚠️ Patch avec données manquantes:', patchData);
          continue;
        }

        // Vérifier les doublons
        const existingPatch = await collection.findOne({ 
          datePatchCumulatif: patchData.datePatchCumulatif,
          numeroPatchCumulatif: patchData.numeroPatchCumulatif
        });

        if (existingPatch) {
          console.log('🔄 Patch existant:', patchData.numeroPatchCumulatif);
          duplicateCount++;
          continue;
        }

        // Créer le document patch
        const newPatch = {
          datePatchCumulatif: patchData.datePatchCumulatif,
          numeroPatchCumulatif: patchData.numeroPatchCumulatif,
          correctifs: patchData.correctifs || [],
          dateImport: new Date(),
          stats: {
            totalCorrectifs: patchData.correctifs?.length || 0,
            technos: [...new Set(patchData.correctifs?.map(c => c.techno).filter(Boolean))],
            modules: [...new Set(patchData.correctifs?.map(c => c.module).filter(Boolean))]
          }
        };
        
        console.log('💾 Insertion patch:', newPatch.numeroPatchCumulatif, 'avec', newPatch.correctifs.length, 'correctifs');
        
        await collection.insertOne(newPatch);
        importedCount++;
      } catch (error) {
        console.error('❌ Erreur sauvegarde patch:', error);
      }
    }

    console.log('✅ Import terminé - Importés:', importedCount, 'Doublons:', duplicateCount);

    return res.json({ 
      success: true,
      imported: importedCount, 
      duplicates: duplicateCount,
      message: `Import terminé: ${importedCount} patches importés, ${duplicateCount} doublons ignorés`
    });

  } catch (error) {
    console.error('💥 Erreur globale:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});


// PUT /api/patches/:patchId - Mettre à jour un patch
router.put('/:patchId', async (req, res) => {
  let client;
  try {
    const patchId = req.params.patchId;
    
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(patchId) },
      { $set: req.body },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return res.status(404).json({ 
        message: 'Patch introuvable' 
      });
    }
    
    return res.status(200).json(result.value);
  } catch (err) {
    console.error('Erreur lors de la mise à jour:', err);
    return res.status(500).json({ 
      message: 'Erreur de mise à jour', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// DELETE /api/patches/:patchId - Supprimer un patch
router.delete('/:patchId', async (req, res) => {
  let client;
  try {
    const patchId = req.params.patchId;
    
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const result = await collection.deleteOne({ _id: new ObjectId(patchId) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        message: 'Patch introuvable' 
      });
    }
    
    return res.status(200).json({ 
      message: 'Patch supprimé avec succès' 
    });
  } catch (err) {
    console.error('Erreur lors de la suppression:', err);
    return res.status(500).json({ 
      message: 'Erreur de suppression', 
      error: err.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// DELETE /api/patches/cleanup - Nettoyer les données incorrectes
router.delete('/cleanup', async (req, res) => {
  let client;
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Supprimer les documents avec des en-têtes ou des données incorrectes
    const deleteResult = await collection.deleteMany({
      $or: [
        { datePatchCumulatif: "Date du patch cumulatif" },
        { numeroPatchCumulatif: "Numéro de patch cumulatif" },
        { patch: "Patch" },
        { module: "Module" },
        { datePatchCumulatif: { $type: "number" } }, // Dates mal formatées
      ]
    });

    console.log('🧹 Documents supprimés:', deleteResult.deletedCount);

    return res.json({
      success: true,
      deleted: deleteResult.deletedCount,
      message: `${deleteResult.deletedCount} documents incorrects supprimés`
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});


// DELETE /api/patches/all - Supprimer tous les patches
router.delete('/all', async (req, res) => {
  let client;
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const result = await collection.deleteMany({});
    
    return res.json({ 
      message: 'Tous les correctifs ont été supprimés',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting patches:', error);
    return res.status(500).json({ 
      error: 'Erreur lors de la suppression' 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Route de test/debug
router.get('/debug/test', async (req, res) => {
  let client;
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const count = await collection.countDocuments();
    const samplePatch = await collection.findOne();
    
    res.json({
      message: 'Connexion MongoDB OK',
      database: dbName,
      collection: collectionName,
      documentCount: count,
      sampleDocument: samplePatch
    });
  } catch (error) {
    console.error('Erreur lors du test de connexion:', error);
    res.status(500).json({ 
      error: error.message 
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

module.exports = router;
