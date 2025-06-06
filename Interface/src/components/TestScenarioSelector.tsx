import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { scenarioAPI } from './api'; // Importer l'API configurée
import { Loader2, Plus, Pencil, Trash2, Play } from 'lucide-react';

interface Formation {
  _id?: string;
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


const TestScenarioSelector: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Formation[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchScenarios = async () => {
    if (!moduleId) {
      setError('Module ID manquant');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(''); // Reset error state
      
      console.log('Fetching scenarios for module:', moduleId);
      
      // Utiliser l'API configurée
      const response = await scenarioAPI.getScenarios(moduleId);
      
      console.log('Response received:', response.data);
      
      // Accepte les deux formats de réponse
      const formations = Array.isArray(response.data)
        ? response.data
        : response.data?.formations || [];
      
      // Add index-based IDs for formations that don't have _id
      const formationsWithIds = formations.map((formation: Formation, index: number) => ({
        ...formation,
        _id: formation._id || `temp-${index}`
      }));
      
      setModules(formationsWithIds);
    } catch (err: any) {
      console.error('Error fetching scenarios:', err);
      
      // Gestion d'erreur plus détaillée
      if (err.response?.status === 404) {
        setError(`Module "${moduleId}" non trouvé`);
      } else if (err.response?.status >= 500) {
        setError('Erreur serveur. Vérifiez que le serveur est démarré.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Erreur réseau. Vérifiez que le serveur est accessible sur http://localhost:3001');
      } else {
        setError(err.response?.data?.message || 'Erreur lors du chargement des scénarios');
      }
      
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, [moduleId]);

  const handleAdd = () => {
    navigate(`/modules/${moduleId}/scenarios/new`);
  };

  const handleEdit = (formation: Formation) => {
    // Toujours utiliser le titre encodé pour l'URL d'édition
    const titreEncodé = encodeURIComponent(formation.titre);
    navigate(`/modules/${moduleId}/scenarios/${titreEncodé}/edit`);
  };

  const handleDelete = async (formation: Formation) => {
    // Use the formation _id if it exists, otherwise use titre
    const formationId = formation._id && !formation._id.startsWith('temp-') 
      ? formation._id 
      : formation.titre;
    
    console.log('Deleting formation:', { id: formationId, titre: formation.titre });
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${formation.titre}" ?`)) {
      try {
        await scenarioAPI.deleteScenario(moduleId!, formationId);
        
        // Refresh the list
        await fetchScenarios();
      } catch (err: any) {
        console.error('Error deleting scenario:', err);
        setError(err.response?.data?.message || 'Erreur lors de la suppression');
      }
    }
  };

  const handleRunTest = (formation: Formation) => {
    // Navigue vers la page d'avancement du test, en passant le titre du scénario
    const titreEncodé = encodeURIComponent(formation.titre);
    navigate(`/modules/${moduleId}/scenarios/${titreEncodé}/run`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Chargement des scénarios...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Scénarios pour le module {moduleId}</h1>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Ajouter un scénario
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erreur:</strong> {error}
        </div>
      )}

      {modules.length === 0 && !loading && !error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Aucun scénario trouvé pour ce module.
        </div>
      )}

      <div className="grid gap-4">
        {modules.map((formation, index) => (
          <div
            key={formation._id || `formation-${index}`}
            className="bg-white rounded-lg shadow-md p-6 relative hover:shadow-lg transition-shadow"
          >
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => handleEdit(formation)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="Modifier le scénario"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(formation)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Supprimer le scénario"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleRunTest(formation)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                title="Lancer le test"
              >
                <Play className="h-5 w-5" />
              </button>
            </div>

            <h2 className="text-xl font-bold mb-2 pr-20">{formation.titre}</h2>
            <p className="text-gray-600 mb-4">{formation.description}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Statut:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  formation.statut === 'actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {formation.statut}
                </span>
              </div>
              <div>
                <span className="font-medium">Formateur:</span> {formation.formateur}
              </div>
              <div>
                <span className="font-medium">Date:</span> {formation.date}
              </div>
              <div>
                <span className="font-medium">Type:</span> {formation.type}
              </div>
              {formation.reference && (
                <div className="col-span-full">
                  <span className="font-medium">Référence:</span> {formation.reference}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestScenarioSelector;