const express = require('express');
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

const router = express.Router();

router.get('/api/pdf/:pdfId', async (req, res) => {
  const pdfId = req.params.pdfId;
  const client = await MongoClient.connect('mongodb://localhost:27017');
  const db = client.db('votre_base_de_donnees'); // Remplace par le nom de ta base
  const bucket = new GridFSBucket(db);

  try {
    res.set('Content-Type', 'application/pdf');
    const downloadStream = bucket.openDownloadStream(new ObjectId(pdfId));
    downloadStream.on('error', () => {
      res.status(404).send('PDF non trouvé');
      client.close();
    });
    downloadStream.on('end', () => {
      client.close();
    });
    downloadStream.pipe(res);
  } catch (e) {
    res.status(400).send('ID invalide');
    client.close();
  }
});

module.exports = router;