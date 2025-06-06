import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Download } from 'lucide-react';
import axios from 'axios';

interface Step {
  description: string;
  status: string;
  result: string;
}

interface Rapport {
  _id: string;
  test_id: string;
  original_test_id?: string;
  status: string;
  date_creation: string;
  steps: Step[];
  module: string;
  scenario: string;
  completed_at?: string;
  execution_time: number;
  filename: string;
  pdf_id: string;
  success: boolean;
}

const RapportPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [modules, setModules] = useState<string[]>([]);

  useEffect(() => {
    const fetchRapport = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/rapport/${testId}`);
        setRapport(res.data.rapport);
        // Assuming the API provides a list of modules, otherwise this part should be removed
        setModules(res.data.modules || []);
      } catch (err: any) {
        setError('Erreur lors du chargement du rapport');
      } finally {
        setLoading(false);
      }
    };
    if (testId) fetchRapport();
  }, [testId]);

  const handleDownload = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/download_pdf/${rapport?.pdf_id}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', rapport?.filename || 'rapport.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Chargement du rapport...</span>
      </div>
    );
  }

  if (error || !rapport) {
    return (
      <div className="p-8 text-center text-red-600">
        {error || "Rapport introuvable"}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Rapport de test</h1>
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-5 w-5" />
          Télécharger le PDF
        </button>
      </div>
      <div className="mb-4">
        <div><span className="font-semibold">Module :</span> {rapport.module}</div>
        <div><span className="font-semibold">Scénario :</span> {rapport.scenario}</div>
        <div><span className="font-semibold">Test ID :</span> {rapport.test_id}</div>
        <div><span className="font-semibold">Statut :</span> 
          <span className={`ml-2 px-2 py-1 rounded text-xs ${
            rapport.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {rapport.success ? 'Succès' : 'Échec'}
          </span>
        </div>
        <div><span className="font-semibold">Début :</span> {new Date(rapport.date_creation).toLocaleString()}</div>
        {rapport.completed_at && (
          <div><span className="font-semibold">Fin :</span> {new Date(rapport.completed_at).toLocaleString()}</div>
        )}
        <div><span className="font-semibold">Durée :</span> {rapport.execution_time.toFixed(2)} s</div>
      </div>
      <div className="mb-4">
        <label className="block font-medium mb-2">Filtrer par module :</label>
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all" key="all">Tous</option>
          {modules.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <h2 className="text-lg font-bold mb-2">Étapes du test</h2>
      <ol className="list-decimal pl-6 space-y-2">
        {rapport.steps.map((step, idx) => (
          <li key={idx} className="bg-gray-50 rounded p-2">
            <div className="font-semibold">{step.description}</div>
            <div>
              <span className="font-medium">Statut :</span> {step.status}
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                step.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : step.status === 'error'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {step.status}
              </span>
            </div>
            <div><span className="font-medium">Résultat :</span> {step.result}</div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default RapportPage;