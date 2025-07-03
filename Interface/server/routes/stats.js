const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// GET /api/stats - Statistiques des rapports
router.get('/', async (req, res) => {
  try {
    const RapportModel = mongoose.connection.collection('rapport');
    const rapports = await RapportModel.find({}).toArray();

    const successCount = rapports.filter(r => r.status === 'completed').length;
    const failureCount = rapports.filter(r => r.status !== 'completed').length;

    const stats = {
      successCount,
      failureCount,
      totalCount: rapports.length,
      successRate: (successCount / (successCount + failureCount)) * 100,
      failureRate: (failureCount / (successCount + failureCount)) * 100,
    };

    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques', error: err.message });
  }
});

module.exports = router;
