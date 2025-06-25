import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Play, 
  ArrowLeft, 
  Calendar,
  User,
  Tag,
  CheckCircle,
  Clock,
  AlertCircle,
  BookOpen,
  Layers
} from 'lucide-react';

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
    setError('');

    console.log('Fetching scenarios for module:', moduleId);
    
    // Remplacez ceci par l'URL correcte selon la structure de votre API
    const apiUrl = `http://localhost:3001/api/modules/ref/${moduleId}`;
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    // Vérifiez si la réponse a réussi
    if (!response.ok) {
      throw new Error(`Erreur: ${response.status}`);
    }

    const data = await response.json();
    console.log('Response received:', data);

    // Assurez-vous que 'module' existe dans la réponse
    const formations = data.module?.formations || [];
    
    const formationsWithIds = formations.map((formation: Formation, index: number) => ({
      ...formation,
      _id: formation._id || `temp-${index}`
    }));

    setModules(formationsWithIds);
  } catch (err: any) {
    console.error('Error fetching scenarios:', err);
    console.error('Full Error:', JSON.stringify(err, null, 2));

    setError(err.message || 'Erreur lors du chargement des scénarios');
    setModules([]);
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    fetchScenarios();
  }, [moduleId]);

  const handleAdd = () => {
    navigate(`api/modules/ref/${moduleId}/scenarios/new`);
  };

  const handleEdit = (formation: Formation) => {
    const titreEncodé = encodeURIComponent(formation.titre);
    navigate(`api/modules/ref/${moduleId}/scenarios/${titreEncodé}/edit`);
  };

  const handleDelete = async (formation: Formation) => {
    const formationId = formation._id && !formation._id.startsWith('temp-') 
      ? formation._id 
      : formation.titre;
    
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer "${formation.titre}" ?`)) {
      try {
        await scenarioAPI.deleteScenario(moduleId!, formationId);
        await fetchScenarios();
      } catch (err: any) {
        console.error('Error deleting scenario:', err);
        setError(err.response?.data?.message || 'Erreur lors de la suppression');
      }
    }
  };

  const handleRunTest = (formation: Formation) => {
    const titreEncodé = encodeURIComponent(formation.titre);
    navigate(`/modules/${moduleId}/scenarios/${titreEncodé}/run`);
  };

  const getStatusIcon = (statut: string) => {
    switch (statut.toLowerCase()) {
      case 'actif':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'en cours':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'inactif':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut.toLowerCase()) {
      case 'actif':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'en cours':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'inactif':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'formation':
        return <BookOpen className="h-4 w-4" />;
      case 'test':
        return <Layers className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin absolute top-4 left-4" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Chargement des scénarios</h2>
          <p className="text-slate-500">Veuillez patienter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/modules')}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">
                  Module <span className="text-blue-600">{moduleId}</span>
                </h1>
                <p className="text-slate-600 mt-1">Gestion des scénarios de formation</p>
              </div>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Nouveau scénario</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 rounded-lg p-6 shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Erreur</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {modules.length === 0 && !loading && !error && (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-4">Aucun scénario disponible</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Commencez par créer votre premier scénario de formation pour ce module.
            </p>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              <Plus className="h-5 w-5" />
              Créer le premier scénario
            </button>
          </div>
        )}

        {/* Scenarios Grid */}
        {modules.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Scénarios</p>
                    <p className="text-2xl font-bold text-slate-800">{modules.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Layers className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Scénarios Actifs</p>
                    <p className="text-2xl font-bold text-green-600">
                      {modules.filter(m => m.statut.toLowerCase() === 'actif').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Types Différents</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {new Set(modules.map(m => m.type)).size}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Tag className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Scenarios List */}
            <div className="space-y-6">
              {modules.map((formation, index) => (
                <div
                  key={formation._id || `formation-${index}`}
                  className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-xl hover:bg-white/90 transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center space-x-3 mb-3">
                          {getTypeIcon(formation.type)}
                          <h2 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {formation.titre}
                          </h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed">
                          {formation.description}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          onClick={() => handleRunTest(formation)}
                          className="p-3 text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-110"
                          title="Lancer le test"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(formation)}
                          className="p-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Modifier le scénario"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(formation)}
                          className="p-3 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Supprimer le scénario"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {/* Status */}
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getStatusColor(formation.statut)}`}>
                          {getStatusIcon(formation.statut)}
                          <span className="font-medium text-sm capitalize">{formation.statut}</span>
                        </div>
                      </div>

                      {/* Formateur */}
                      <div className="flex items-center space-x-3 text-slate-600">
                        <User className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pilote projet</p>
                          <p className="font-medium">{formation.formateur}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center space-x-3 text-slate-600">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date</p>
                          <p className="font-medium">{new Date(formation.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="flex items-center space-x-3 text-slate-600">
                        <Tag className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Testeur</p>
                          <p className="font-medium capitalize">{formation.type}</p>
                        </div>
                      </div>
                    </div>

                    {/* Reference (if exists) */}
                    {formation.reference && (
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                          <span className="font-medium">Référence:</span>
                          <code className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono">
                            {formation.reference}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TestScenarioSelector;
