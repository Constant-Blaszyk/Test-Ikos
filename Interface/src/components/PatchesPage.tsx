
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Search, 
  Filter, 
  Eye, 
  EyeOff,
  Calendar,
  Package,
  Users,
  Code,
  RefreshCw
} from 'lucide-react';

const API_URL = 'http://10.110.6.139:3001/api';

const PatchesPage = () => {
  const [patches, setPatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTechno, setFilterTechno] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterDestinataire, setFilterDestinataire] = useState('all');
  const [expandedPatches, setExpandedPatches] = useState(new Set());

  // État pour les statistiques
  const [stats, setStats] = useState({
    total: 0,
    totalCorrectifs: 0,
    byTechno: {},
    byModule: {},
    byDestinataire: {}
  });

  useEffect(() => {
    fetchPatches();
  }, []);

  // Fonction pour convertir les dates Excel
  const excelDateToJSDate = (excelDate) => {
    if (typeof excelDate === 'string') {
      // Si c'est déjà une chaîne de caractères, essayer de la parser
      const parts = excelDate.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Les mois JS commencent à 0
        const year = parseInt(parts[2]);
        return `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;
      }
      return excelDate;
    }
    
    if (typeof excelDate === 'number') {
      // Convertir le nombre Excel en date JavaScript
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
    
    return excelDate;
  };

  // Fonction de parsing Excel corrigée
  // Fonction de parsing Excel corrigée pour gérer le fichier "Resultat"
const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        console.log('📖 Lecture du fichier Excel...');
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Chercher la feuille "Resultat" ou prendre la première
        let sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('resultat') || 
          name.toLowerCase().includes('result')
        ) || workbook.SheetNames[0];
        
        console.log('📊 Feuille utilisée:', sheetName);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          raw: false
        });

        console.log('📋 Données brutes:', jsonData);

        // Filtrer les lignes vides et trouver l'en-tête
        const nonEmptyRows = jsonData.filter(row => 
          row && row.length > 0 && row.some(cell => cell && cell.toString().trim() !== '')
        );

        console.log('📋 Lignes non vides:', nonEmptyRows.length);

        // Chercher la ligne d'en-tête (contient "Date du patch" ou "Patch")
        let headerRowIndex = -1;
        let headerRow = null;

        for (let i = 0; i < nonEmptyRows.length; i++) {
          const row = nonEmptyRows[i];
          const rowStr = row.join('|').toLowerCase();
          
          if (rowStr.includes('date du patch') || 
              rowStr.includes('patch') && rowStr.includes('module') ||
              rowStr.includes('numéro de patch')) {
            headerRowIndex = i;
            headerRow = row;
            console.log('🎯 En-tête trouvé à la ligne:', i, headerRow);
            break;
          }
        }

        if (headerRowIndex === -1) {
          console.error('❌ Impossible de trouver l\'en-tête dans le fichier');
          console.log('📋 Premières lignes:', nonEmptyRows.slice(0, 5));
          reject(new Error('Format de fichier non reconnu - en-tête introuvable'));
          return;
        }

        // Mapping des colonnes
        const columnMapping = {};
        headerRow.forEach((header, index) => {
          const headerLower = header.toString().toLowerCase().trim();
          
          if (headerLower.includes('date du patch') || headerLower.includes('date patch')) {
            columnMapping.datePatchCumulatif = index;
          } else if (headerLower.includes('numéro de patch') || headerLower.includes('numero patch')) {
            columnMapping.numeroPatchCumulatif = index;
          } else if (headerLower === 'patch') {
            columnMapping.patch = index;
          } else if (headerLower === 'module') {
            columnMapping.module = index;
          } else if (headerLower.includes('nom du traitement') || headerLower.includes('traitement')) {
            columnMapping.nomTraitement = index;
          } else if (headerLower === 'description') {
            columnMapping.description = index;
          } else if (headerLower.includes('destinataire')) {
            columnMapping.destinataire = index;
          } else if (headerLower.includes('référence dossier client') || headerLower.includes('reference dossier client')) {
            columnMapping.referenceDossier = index;
          } else if (headerLower.includes('référence dossier sopra') || headerLower.includes('reference dossier sopra')) {
            columnMapping.referenceDossierSopra = index;
          } else if (headerLower === 'techno') {
            columnMapping.techno = index;
          }
        });

        console.log('🗂️ Mapping des colonnes:', columnMapping);

        // Traiter les données à partir de la ligne suivant l'en-tête
        const dataRows = nonEmptyRows.slice(headerRowIndex + 1);
        console.log('📊 Lignes de données à traiter:', dataRows.length);

        const correctifs = [];

        dataRows.forEach((row, index) => {
          // Vérifier si la ligne contient des données valides
          const hasValidData = row.some((cell, cellIndex) => {
            // Ignorer les colonnes de date et numéro de patch pour cette vérification
            if (cellIndex === columnMapping.datePatchCumulatif || 
                cellIndex === columnMapping.numeroPatchCumulatif) {
              return false;
            }
            return cell && cell.toString().trim() !== '';
          });

          if (!hasValidData) {
            console.log(`⏭️ Ligne ${index + 1} ignorée (vide)`);
            return;
          }

          const correctif = {
            datePatchCumulatif: columnMapping.datePatchCumulatif !== undefined ? 
              excelDateToJSDate(row[columnMapping.datePatchCumulatif]) : '',
            numeroPatchCumulatif: columnMapping.numeroPatchCumulatif !== undefined ? 
              (row[columnMapping.numeroPatchCumulatif] || '').toString().trim() : '',
            patch: columnMapping.patch !== undefined ? 
              (row[columnMapping.patch] || '').toString().trim() : '',
            module: columnMapping.module !== undefined ? 
              (row[columnMapping.module] || '').toString().trim() : '',
            nomTraitement: columnMapping.nomTraitement !== undefined ? 
              (row[columnMapping.nomTraitement] || '').toString().trim() : '',
            description: columnMapping.description !== undefined ? 
              (row[columnMapping.description] || '').toString().trim() : '',
            destinataire: columnMapping.destinataire !== undefined ? 
              (row[columnMapping.destinataire] || '').toString().trim() : '',
            referenceDossier: columnMapping.referenceDossier !== undefined ? 
              (row[columnMapping.referenceDossier] || '').toString().trim() : '',
            referenceDossierSopra: columnMapping.referenceDossierSopra !== undefined ? 
              (row[columnMapping.referenceDossierSopra] || '').toString().trim() : '',
            techno: columnMapping.techno !== undefined ? 
              (row[columnMapping.techno] || '').toString().trim() : '',
          };

          // Vérifier qu'au moins un champ important est rempli
          if (correctif.patch || correctif.module || correctif.description) {
            correctifs.push(correctif);
            console.log(`✅ Correctif ${index + 1} ajouté:`, {
              patch: correctif.patch,
              module: correctif.module,
              description: correctif.description?.substring(0, 50) + '...'
            });
          } else {
            console.log(`⏭️ Ligne ${index + 1} ignorée (pas de données pertinentes)`);
          }
        });

        console.log('✅ Correctifs parsés:', correctifs.length);
        console.log('📄 Premier correctif:', correctifs[0]);

        if (correctifs.length === 0) {
          reject(new Error('Aucun correctif valide trouvé dans le fichier'));
          return;
        }

        // Grouper par patch cumulatif
        const patchesMap = new Map();
        
        correctifs.forEach(correctif => {
          const key = `${correctif.datePatchCumulatif}_${correctif.numeroPatchCumulatif}`;
          
          if (!patchesMap.has(key)) {
            patchesMap.set(key, {
              datePatchCumulatif: correctif.datePatchCumulatif,
              numeroPatchCumulatif: correctif.numeroPatchCumulatif,
              correctifs: []
            });
          }
          
          patchesMap.get(key).correctifs.push(correctif);
        });

        const patches = Array.from(patchesMap.values());
        
        console.log('🎯 Patches groupés:', patches.length);
        console.log('📄 Premier patch groupé:', patches[0]);

        resolve(patches);

      } catch (error) {
        console.error('❌ Erreur parsing Excel:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};


  // Fetch patches from database
  const fetchPatches = async () => {
    setLoading(true);
    try {
      console.log('🔄 Chargement des patches...');
      const response = await axios.get(`${API_URL}/patches`);
      console.log('📄 Response from API:', response.data);
      
      const patchesData = response.data.patches || [];
      console.log('📊 Patches récupérés:', patchesData.length);
      
      setPatches(patchesData);
      calculateStats(patchesData);
    } catch (error) {
      console.error('❌ Error fetching patches:', error);
      showNotification('Erreur lors du chargement des correctifs', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const calculateStats = (patchesData) => {
    const stats = {
      total: patchesData.length,
      totalCorrectifs: 0,
      byTechno: {},
      byModule: {},
      byDestinataire: {}
    };

    patchesData.forEach(patch => {
      if (patch.correctifs && Array.isArray(patch.correctifs)) {
        stats.totalCorrectifs += patch.correctifs.length;
        
        patch.correctifs.forEach(correctif => {
          // Stats par technologie
          if (correctif.techno) {
            stats.byTechno[correctif.techno] = (stats.byTechno[correctif.techno] || 0) + 1;
          }
          
          // Stats par module
          if (correctif.module) {
            stats.byModule[correctif.module] = (stats.byModule[correctif.module] || 0) + 1;
          }
          
          // Stats par destinataire
          if (correctif.destinataire) {
            stats.byDestinataire[correctif.destinataire] = (stats.byDestinataire[correctif.destinataire] || 0) + 1;
          }
        });
      }
    });

    setStats(stats);
  };

  // Upload file
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('📁 Fichier sélectionné:', file.name);

    setUploading(true);
    try {
      const patchesData = await parseExcelFile(file);
      console.log('📊 Données parsées:', patchesData.length, 'patches');
      console.log('📄 Premier patch:', patchesData[0]);

      // Envoyer au serveur avec logs
      console.log('🚀 Envoi vers serveur...');
      const response = await axios.post(`${API_URL}/patches/import`, {
        patches: patchesData
      });

      console.log('✅ Réponse serveur:', response.data);

      showNotification(
        `Import réussi: ${response.data.imported} patches importés`,
        'success'
      );
      
      // Recharger les données
      await fetchPatches();
    } catch (error) {
      console.error('❌ Erreur upload:', error.response?.data || error.message);
      showNotification(`Erreur: ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // Fonction de nettoyage
  const handleCleanup = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer les données incorrectes ?')) {
      return;
    }

    try {
      console.log('🧹 Nettoyage des données...');
      const response = await axios.delete(`${API_URL}/patches/cleanup`);
      console.log('✅ Nettoyage terminé:', response.data);
      
      showNotification(`Nettoyage terminé: ${response.data.deleted} documents supprimés`, 'success');
      await fetchPatches();
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      showNotification(`Erreur lors du nettoyage: ${error.response?.data?.error || error.message}`, 'error');
    }
  };

  // Delete all patches
  const handleDeleteAll = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer tous les correctifs ?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/patches`);
      showNotification('Tous les correctifs ont été supprimés', 'success');
      await fetchPatches();
    } catch (error) {
      showNotification('Erreur lors de la suppression', 'error');
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 5000);
  };

  // Toggle patch expansion
  const togglePatchExpansion = (patchId) => {
    const newExpanded = new Set(expandedPatches);
    if (newExpanded.has(patchId)) {
      newExpanded.delete(patchId);
    } else {
      newExpanded.add(patchId);
    }
    setExpandedPatches(newExpanded);
  };

  // Filtrer les patches
  const filteredPatches = patches.filter(patch => {
    if (!patch.correctifs) return false;
    
    const matchesSearch = searchTerm === '' || 
      patch.numeroPatchCumulatif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patch.correctifs.some(c => 
        c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.patch?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.module?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesTechno = filterTechno === 'all' || 
      patch.correctifs.some(c => c.techno === filterTechno);

    const matchesModule = filterModule === 'all' || 
      patch.correctifs.some(c => c.module === filterModule);

    const matchesDestinataire = filterDestinataire === 'all' || 
      patch.correctifs.some(c => c.destinataire === filterDestinataire);

    const matchesDate = patch.datePatchCumulatif ?
        patch.datePatchCumulatif.includes(searchTerm) : false;


    return matchesSearch && matchesTechno && matchesModule && matchesDestinataire && matchesDate;
  });

  // Export to Excel
  const handleExport = async () => {
    try {
      // Préparer les données pour l'export
      const exportData = [];
      
      filteredPatches.forEach(patch => {
        patch.correctifs.forEach(correctif => {
          exportData.push({
            'Date du patch': patch.datePatchCumulatif,
            'Numéro de patch': patch.numeroPatchCumulatif,
            'Patch': correctif.patch || '',
            'Module': correctif.module || '',
            'Nom du traitement': correctif.nomTraitement || '',
            'Description': correctif.description || '',
            'Destinataire': correctif.destinataire || '',
            'Référence dossier client': correctif.referenceDossier || '',
            'Référence dossier Sopra': correctif.referenceDossierSopra || '',
            'Technologie': correctif.techno || ''
          });
        });
      });

      // Créer le fichier Excel
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patches');
      
      // Télécharger le fichier
      XLSX.writeFile(wb, `patches_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showNotification('Export réussi', 'success');
    } catch (error) {
      showNotification('Erreur lors de l\'export', 'error');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Titre */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Package className="w-8 h-8 text-blue-600" />
          Gestion des Patches
        </h1>
        <p className="text-gray-600 mt-2">
          Importez et gérez vos correctifs de patches cumulatifs
        </p>
      </div>

      {/* Notification */}
      {notification.message && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
          notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
          'bg-blue-50 text-blue-700 border border-blue-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
           notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
           <AlertCircle className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-4">
        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Importer Excel
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>

        <button
          onClick={handleExport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          disabled={patches.length === 0}
        >
          <Download className="w-4 h-4" />
          Exporter Excel
        </button>

        <button
          onClick={fetchPatches}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>

        

        <button
          onClick={handleDeleteAll}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Tout supprimer
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Patches</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCorrectifs}</p>
              <p className="text-sm text-gray-600">Correctifs</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byTechno).length}</p>
              <p className="text-sm text-gray-600">Technologies</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byDestinataire).length}</p>
              <p className="text-sm text-gray-600">Destinataires</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technologie</label>
            <select
              value={filterTechno}
              onChange={(e) => setFilterTechno(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Toutes les technologies</option>
              {Object.keys(stats.byTechno).map(techno => (
                <option key={techno} value={techno}>
                  {techno} ({stats.byTechno[techno]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les modules</option>
              {Object.keys(stats.byModule).map(module => (
                <option key={module} value={module}>
                  {module} ({stats.byModule[module]})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Destinataire</label>
            <select
              value={filterDestinataire}
              onChange={(e) => setFilterDestinataire(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tous les destinataires</option>
              {Object.keys(stats.byDestinataire).map(destinataire => (
                <option key={destinataire} value={destinataire}>
                  {destinataire} ({stats.byDestinataire[destinataire]})
                </option>
              ))}
            </select>
          </div>
         
        </div>
      </div>

      {/* Liste des patches */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Liste des Patches ({filteredPatches.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredPatches.reduce((total, patch) => total + (patch.correctifs?.length || 0), 0)} correctifs au total
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600 mt-2">Chargement des correctifs...</p>
          </div>
        ) : filteredPatches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>Aucun correctif trouvé</p>
            <p className="text-sm mt-1">Importez un fichier Excel pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPatches.map((patch) => {
              const isExpanded = expandedPatches.has(patch._id);
              const correctifsCount = patch.correctifs?.length || 0;
              
              return (
                <div key={patch._id} className="p-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-3 rounded"
                    onClick={() => togglePatchExpansion(patch._id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Patch {patch.numeroPatchCumulatif}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {patch.datePatchCumulatif} • {correctifsCount} correctifs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                        {correctifsCount} correctifs
                      </span>
                      {isExpanded ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 ml-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Correctifs du patch</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-300">
                                <th className="text-left py-2 px-3 font-medium text-gray-900">PATCH</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">MODULE</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">TRAITEMENT</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">DESCRIPTION</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">DESTINATAIRE</th>
                                <th className="text-left py-2 px-3 font-medium text-gray-900">TECHNO</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patch.correctifs?.map((correctif, index) => (
                                <tr key={index} className="border-b border-gray-200">
                                  <td className="py-2 px-3 font-mono text-xs">
                                    {correctif.patch || '-'}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                      {correctif.module || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-gray-700">
                                    {correctif.nomTraitement || '-'}
                                  </td>
                                   <td className="py-2 px-3 text-gray-700">
                                    <div className="max-w-md">
                                      <p className="truncate" title={correctif.description}>
                                        {correctif.description || '-'}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      correctif.destinataire === 'Utilisateur' 
                                        ? 'bg-green-100 text-green-800'
                                        : correctif.destinataire === 'Exploitant'
                                        ? 'bg-orange-100 text-orange-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {correctif.destinataire || '-'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      correctif.techno === 'Java' 
                                        ? 'bg-red-100 text-red-800'
                                        : correctif.techno === 'IBM'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-purple-100 text-purple-800'
                                    }`}>
                                      {correctif.techno || '-'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Références du patch */}
                        {patch.correctifs?.some(c => c.referenceDossier || c.referenceDossierSopra) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="font-medium text-gray-900 mb-2">Références</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {patch.correctifs?.map((correctif, index) => (
                                <div key={index} className="space-y-1">
                                  {correctif.referenceDossier && (
                                    <div>
                                      <span className="text-gray-600">Réf. Client:</span>{' '}
                                      <span className="font-mono">{correctif.referenceDossier}</span>
                                    </div>
                                  )}
                                  {correctif.referenceDossierSopra && (
                                    <div>
                                      <span className="text-gray-600">Réf. Sopra:</span>{' '}
                                      <span className="font-mono">{correctif.referenceDossierSopra}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Informations complémentaires */}
      {patches.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Répartition par technologie</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byTechno).map(([techno, count]) => (
              <span
                key={techno}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  techno === 'Java' 
                    ? 'bg-red-100 text-red-800'
                    : techno === 'IBM'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {techno}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatchesPage;