import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permet l'accès depuis d'autres machines
    port: 80,       // Port par défaut de Vite
    strictPort: true, // Évite de changer de port si 80 est occupé
    allowedHosts: [
      'ikotest.maisonsetcites.local', // Votre domaine personnalisé
      'localhost',
      '127.0.0.1',
      '.maisonsetcites.local' // Autorise tous les sous-domaines
    ]
  },
  optimizeDeps: {
    exclude: ['lucide-react'] // Exclut lucide-react de l'optimisation des dépendances
  },
  preview: {
    host: '0.0.0.0', // Permet aussi l'accès en mode preview
    port: 4173       // Port par défaut pour la preview
  }
});