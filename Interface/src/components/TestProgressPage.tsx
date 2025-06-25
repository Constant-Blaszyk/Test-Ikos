import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const TestProgressPage = () => {
  const { moduleId, scenarioId } = useParams<{ moduleId: string; scenarioId: string }>();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Lancer le test automatique au chargement
  useEffect(() => {
    const runTest = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/runCTXTest', {
          params: {
            testId: `${moduleId}_${decodeURIComponent(scenarioId || '')}`,
          },
        });
        if (response.data && response.data.test_id) {
          setTaskId(response.data.test_id);
        } else {
          console.error('Réponse vide ou sans test_id pour le lancement du test');
          setError('Impossible de récupérer le taskId');
        }
      } catch (err: any) {
        console.error('Erreur lors du lancement du test automatique:', err);
        setError('Erreur lors du lancement du test automatique');
      }
    };
    if (moduleId && scenarioId) runTest();
  }, [moduleId, scenarioId]);

  // Suivre l’avancement du test
  useEffect(() => {
    if (!taskId) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/test_status/${taskId}`);
        if (res.data) {
          setProgress(res.data.progress);
          const newStatus = res.data.status;
          setStatus(
            newStatus === 'completed'
              ? 'finished'
              : newStatus === 'error'
              ? 'failed'
              : newStatus === 'running' || newStatus === 'pending'
              ? newStatus
              : 'unknown'
          );
          if (['finished', 'failed'].includes(newStatus)) {
            clearInterval(interval);
          }
        } else {
          console.error('Réponse vide pour le statut du test');
          setError('Erreur lors de la récupération du statut du test');
          clearInterval(interval);
        }
      } catch (err: any) {
        console.error('Erreur lors de la récupération du statut du test:', err);
        setError('Erreur lors de la récupération du statut du test');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [taskId]);

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Avancement du test : {decodeURIComponent(scenarioId || '')}
      </h1>
      <div className="w-full max-w-md mb-6">
        <div className="bg-gray-200 rounded-full h-8 shadow-inner">
          <div
            className="bg-green-500 h-8 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-lg font-bold text-gray-700 mt-2 block text-center">{progress}%</span>
      </div>
      <div className="text-lg font-medium">
        {status === 'pending' && (
          <span className="text-yellow-600 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            En attente...
          </span>
        )}
        {status === 'running' && (
          <span className="text-blue-600 flex items-center">
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            En cours...
          </span>
        )}
        {status === 'finished' && (
          <span className="text-green-700 font-bold flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Test terminé !
          </span>
        )}
        {status === 'failed' && (
          <span className="text-red-700 font-bold flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Échec du test
          </span>
        )}
      </div>
    </div>
  );
};

export default TestProgressPage;
