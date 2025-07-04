import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const TestProgressPage = () => {
  const { moduleId, scenarioId } = useParams();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');
  const [testId, setTestId] = useState(null);
  const [objectId, setObjectId] = useState(null); // Nouveau state pour objectId
  const [error, setError] = useState('');
  const [stepsCount, setStepsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fonction pour générer l'ID du test (même logique que votre backend)
  const generateTestId = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    return `${moduleId}_${decodeURIComponent(scenarioId || '')}_${timestamp}`;
  };

  // Fonction pour récupérer l'objectId à partir du testId
  const getObjectId = async (testId) => {
    try {
      const response = await axios.get(`http://10.110.6.139:5000/api/test-object-id/${testId}`);
      return response.data.objectId;
    } catch (err) {
      console.error('Erreur lors de la récupération de l\'objectId:', err);
      return null;
    }
  };

  // Fonction pour récupérer le test en cours ou le dernier test
  const getCurrentTest = async () => {
    try {
      const response = await axios.get(`http://10.110.6.139:5000/api/current-test?module=${moduleId}&scenario=${encodeURIComponent(scenarioId || '')}`);
      
      if (response.data && response.data.test_id) {
        console.log('Test en cours trouvé:', response.data.test_id);
        setTestId(response.data.test_id);
        setStatus(response.data.status);
        setProgress(response.data.progress || 0);
        
        // Récupérer l'objectId si disponible
        if (response.data.objectId) {
          setObjectId(response.data.objectId);
        }
        
        return true;
      }
    } catch (err) {
      console.log('Aucun test en cours trouvé, création d\'un nouveau test');
    }
    return false;
  };

  // Démarrer ou récupérer le test
  useEffect(() => {
    if (isInitialized) return;
    
    const simpleInit = async () => {
      setIsInitialized(true);
      
      try {
        // Essayer de démarrer le test
        const response = await axios.post('http://10.110.6.139:5000/api/start-test', {
          moduleId,
          scenarioId: decodeURIComponent(scenarioId || '')
        });
        
        setTestId(response.data.test_id);
        setStatus('running');
        
      } catch (err) {
        if (err.response?.status === 409) {
          // Conflit = test déjà en cours
          console.log('Test déjà en cours, récupération...');
          
          // Générer l'ID du test basé sur le pattern de votre backend
          const currentTestId = generateTestId();
          setTestId(currentTestId);
          setStatus('running');
          
        } else {
          setError(`Erreur: ${err.response?.data?.error || err.message}`);
        }
      }
    };

    if (moduleId && scenarioId && !isInitialized) {
      simpleInit();
    }
  }, [moduleId, scenarioId, isInitialized]);

  // Polling optimisé
  useEffect(() => {
    if (!testId) return;

    let pollInterval;
    let consecutiveErrors = 0;
    const maxErrors = 3;

    const poll = async () => {
      try {
        console.log('Vérification du statut pour:', testId);
        
        const response = await axios.get(`http://10.110.6.139:5000/api/test-status/${testId}`);
        const data = response.data;
        
        console.log('Statut reçu:', data);
        
        // Reset des erreurs consécutives
        consecutiveErrors = 0;
        
        // Mise à jour de l'état
        setProgress(data.progress || 0);
        setStepsCount(data.steps?.length || 0);
        setStatus(data.status);
        
        // Récupérer l'objectId si disponible dans la réponse
        if (data.objectId) {
          setObjectId(data.objectId);
        }
        
        // Si le test est terminé et qu'on n'a pas encore l'objectId, le récupérer
        if ((data.status === 'completed' || data.status === 'error') && !objectId) {
          const fetchedObjectId = await getObjectId(testId);
          if (fetchedObjectId) {
            setObjectId(fetchedObjectId);
          }
        }
        
        // Arrêter le polling si terminé
        if (data.status === 'completed' || data.status === 'error') {
          clearInterval(pollInterval);
          console.log('Test terminé, arrêt du polling');
        }
        
      } catch (err) {
        consecutiveErrors++;
        console.error(`Erreur polling (${consecutiveErrors}/${maxErrors}):`, err.message);
        
        if (consecutiveErrors >= maxErrors) {
          clearInterval(pollInterval);
          if (err.response?.status === 404) {
            setError('Test non trouvé - il se peut qu\'il soit terminé');
          } else {
            setError(`Erreur de communication: ${err.message}`);
          }
        }
      }
    };

    // Démarrer le polling immédiatement, puis toutes les 2 secondes
    poll();
    pollInterval = setInterval(poll, 2000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [testId, objectId]);

  // Fonction pour obtenir l'affichage du statut
  const getStatusDisplay = () => {
    switch (status) {
      case 'pending':
        return {
          text: 'Initialisation...',
          color: 'text-blue-600',
          icon: <div className="w-4 h-4 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        };
      case 'running':
        return {
          text: 'Test en cours...',
          color: 'text-blue-600',
          icon: <div className="w-4 h-4 mr-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        };
      case 'completed':
        return {
          text: 'Test terminé avec succès !',
          color: 'text-green-700',
          icon: (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case 'error':
        return {
          text: 'Échec du test',
          color: 'text-red-700',
          icon: (
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      default:
        return {
          text: 'Chargement...',
          color: 'text-gray-600',
          icon: <div className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-lg max-w-md">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Erreur</span>
          </div>
          <p className="mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">
          Test : {decodeURIComponent(scenarioId || '')}
        </h1>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progression</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                status === 'completed' ? 'bg-green-500' : 
                status === 'error' ? 'bg-red-500' : 
                'bg-blue-500'
              }`}
              style={{ width: `${Math.max(progress, 0)}%` }}
            />
          </div>
        </div>

        <div className="text-center mb-4">
          <div className={`text-lg font-medium flex items-center justify-center ${statusDisplay.color}`}>
            {statusDisplay.icon}
            {statusDisplay.text}
          </div>
        </div>

        <div className="text-sm text-gray-600 text-center space-y-1">
          {testId && <div>Test ID: {testId}</div>}
          {objectId && <div>Object ID: {objectId}</div>}
          {stepsCount > 0 && <div>Étapes: {stepsCount}</div>}
        </div>

        {status === 'completed' && (
          <div className="mt-6 text-center">
            <button
              onClick={async () => {
                // Utiliser objectId si disponible, sinon fallback vers testId
                let reportId = objectId;
                
                if (!reportId) {
                  // Essayer de récupérer l'objectId une dernière fois
                  reportId = await getObjectId(testId);
                }
                
                // Utiliser objectId ou testId comme fallback
                const finalReportId = reportId || testId;
                window.location.href = `/reports/${finalReportId}`;
              }}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              Voir les résultats
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestProgressPage;