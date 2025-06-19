import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const TestProgressPage: React.FC = () => {
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
        // Si tu veux utiliser un task_id, adapte ici selon la réponse de ton API
        setTaskId(response.data.test_id || null);
      } catch (err: any) {
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
        setProgress(res.data.progress); // progress = 0 à 100
        setStatus(
          res.data.status === 'completed'
            ? 'finished'
            : res.data.status === 'error'
            ? 'failed'
            : res.data.status
        ); // status = "pending", "running", "finished", "failed"
        if (res.data.status === 'finished' || res.data.status === 'failed') {
          clearInterval(interval);
        }
      } catch (err) {
        setError('Erreur lors de la récupération du statut du test');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [taskId]);

  if (error) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">
        Avancement du test : {decodeURIComponent(scenarioId || '')}
      </h1>
      <div className="w-full max-w-md bg-gray-200 rounded-full h-6 mb-4">
        <div
          className="bg-green-500 h-6 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-lg">{progress}%</span>
      <div className="mt-4">
        {status === 'pending' && <span className="text-yellow-600">En attente...</span>}
        {status === 'running' && <span className="text-blue-600">En cours...</span>}
        {status === 'finished' && <span className="text-green-700 font-bold">Test terminé !</span>}
        {status === 'failed' && <span className="text-red-700 font-bold">Échec du test</span>}
      </div>
    </div>
  );
};

export default TestProgressPage;

