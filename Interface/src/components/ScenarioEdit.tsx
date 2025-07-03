import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';

interface FormData {
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

const ScenarioEdit: React.FC = () => {
  const { moduleId, scenarioId } = useParams<{ moduleId: string; scenarioId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    titre: '',
    description: '',
    prerequis: '',
    date: '',
    type: '',
    systeme: '',
    statut: '',
    reference: '',
    commentaires: '',
    formateur: ''
  });
  const [availableScenarios, setAvailableScenarios] = useState<Array<{ id: string; titre: string }>>([]);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/modules/${moduleId}/scenarios/${scenarioId}`);
        
        // Assurez-vous que nous assignons formData correctement
        setFormData(response.data.data);
      } catch (err: any) {
        console.error('Error fetching scenario:', err);
        
        // Store available scenarios if returned in error response
        if (err.response?.data?.availableEndpoints) {
          setAvailableScenarios(err.response.data.availableEndpoints);
        }
        setError(err.response?.data?.message || 'Failed to fetch scenario');
      } finally {
        setLoading(false);
      }
    };

    if (moduleId && scenarioId) {
      fetchScenario();
    }
  }, [moduleId, scenarioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/api/modules/${moduleId}/scenarios/${scenarioId}`, formData);
      navigate(`/modules/${moduleId}/scenarios`);
    } catch (err) {
      console.error('Error updating scenario:', err);
      setError(
        err.code === 'ERR_NETWORK'
          ? 'Server connection failed - Please check if the server is running'
          : 'Failed to update scenario'
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Modifier le Scénario</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Erreur: {error}</p>
          {availableScenarios.length > 0 && (
            <div className="mt-2">
              <p className="font-semibold">Scénarios disponibles :</p>
              <ul className="list-disc pl-5 mt-1">
                {availableScenarios.map(scenario => (
                  <li key={scenario.id} className="mt-1">
                    <button
                      onClick={() => navigate(`/modules/${moduleId}/scenarios/${scenario.id}/edit`)}
                      className="text-blue-600 hover:underline text-left"
                    >
                      {scenario.titre} (ID: {scenario.id})
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Form Fields */}
        {Object.entries(formData).map(([key, value]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
            {key === 'description' ? (
              <textarea
                name={key}
                value={value}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                rows={3}
                required
              />
            ) : (
              <input
                type="text"
                name={key}
                value={value}
                onChange={handleChange}
                className="w-full p-2 border rounded-md"
                required={key === 'titre' || key === 'description'} // 'titre' and 'description' are mandatory
              />
            )}
          </div>
        ))}

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => navigate(`/modules/${moduleId}/scenarios`)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScenarioEdit;
