import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface Formation {
  _id: string;
  titre: string;
  description: string;
  prerequis: string;
  date: string;
  type: string;
  systeme: string;
  statut: string;
  reference: string;
  commentaires: string;
  formateur: string;
}

const ScenarioDetail: React.FC = () => {
  const { moduleId, scenarioId } = useParams<{ moduleId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchScenarioDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://10.110.6.139:3001/api/modules/${moduleId}/scenarios/${scenarioId}`
        );
        setScenario(response.data);
      } catch (err) {
        console.error('Error fetching scenario details:', err);
        setError('Failed to load scenario details');
      } finally {
        setLoading(false);
      }
    };

    if (moduleId && scenarioId) {
      fetchScenarioDetails();
    }
  }, [moduleId, scenarioId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!scenario) {
    return <div className="text-center p-4">Scenario not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button
        onClick={() => navigate(`/modules/${moduleId}/scenarios`)}
        className="mb-6 text-blue-500 hover:text-blue-700"
      >
        ← Back to scenarios
      </button>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4">{scenario.titre}</h1>
        
        <div className="grid gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-line">{scenario.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Details</h2>
              <ul className="space-y-2">
                <li><span className="font-medium">Status:</span> {scenario.statut}</li>
                <li><span className="font-medium">Reference:</span> {scenario.reference}</li>
                <li><span className="font-medium">Trainer:</span> {scenario.formateur}</li>
                <li><span className="font-medium">Type:</span> {scenario.type || 'N/A'}</li>
                <li><span className="font-medium">System:</span> {scenario.systeme || 'N/A'}</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Prerequisites</h2>
              <p className="text-gray-700">{scenario.prerequis || 'No prerequisites'}</p>
            </div>
          </div>

          {scenario.commentaires && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Comments</h2>
              <p className="text-gray-700">{scenario.commentaires}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioDetail;