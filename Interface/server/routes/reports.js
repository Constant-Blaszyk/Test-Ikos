const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();

// Supposons que tu utilises Mongoose ou le driver natif
router.get('/api/reports/:id', async (req, res) => {
  const id = req.params.id;
  const db = req.app.locals.db; // ou ta façon d'accéder à la base
  let rapport = null;

  // Essaye d'abord par _id (ObjectId)
  if (ObjectId.isValid(id)) {
    rapport = await db.collection('rapports').findOne({ _id: new ObjectId(id) });
  }
  // Sinon, essaye par test_id
  if (!rapport) {
    rapport = await db.collection('rapports').findOne({ test_id: id });
  }

  if (!rapport) {
    return res.status(404).json({ error: 'Rapport non trouvé', test_id: id });
  }

  // Ajoute modules si besoin
  const modules = await db.collection('rapports').distinct('module');

  res.json({ rapport, modules });
});

module.exports = router;