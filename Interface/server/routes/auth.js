const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use env variable in production

// Route de connexion - CORRIGÉE pour utiliser MongoDB
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Recherche l'utilisateur dans la base de données MongoDB
    const user = await User.findOne({ username: username });
    
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifie le mot de passe avec bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Mot de passe invalide' });
    }

    // Génère le token JWT
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username 
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// Route d'inscription - DÉJÀ CORRECTE
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Vérifie si l'utilisateur existe déjà
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Un utilisateur avec ce nom ou cet email existe déjà.' 
      });
    }

    // Crée et sauvegarde le nouvel utilisateur
    const user = new User({ username, email, password });
    await user.save();
    
    res.status(201).json({ 
      message: 'Utilisateur créé avec succès.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de l\'inscription.', 
      error: error.message 
    });
  }
});

module.exports = router;