import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Loader2, 
  Download, 
  AlertCircle, 
  ArrowLeft, 
  FileText, 
  Clock,
  Calendar,
  Target,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
  Layers,
  User,
  Hash,
  Timer
} from 'lucide-react';

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
  const params = useParams();
  const navigate = useNavigate();
  const testId = params.testId || params.id || params.reportId;
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredSteps, setFilteredSteps] = useState<Step[]>([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!testId || testId.trim() === '') {
      setError('ID de test manquant dans l\'URL');
      setLoading(false);
      return;
    }

    const fetchRapport = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get(`http://10.110.6.139:5000/api/reports/${testId}`);
        setRapport(res.data);
        setFilteredSteps(res.data.steps || []);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError('Rapport introuvable');
        } else {
          setError(`Erreur lors du chargement du rapport: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRapport();
  }, [testId]);

  const handleDownload = async () => {
    if (!rapport?.pdf_id) {
      alert('ID du PDF manquant');
      return;
    }

    try {
      setDownloading(true);
      const res = await axios.get(
        `http://10.110.6.139:5000/api/download_pdf/${rapport.pdf_id}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', rapport.filename || 'rapport.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur téléchargement:', err);
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
      case 'failed':
      case 'failure':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
      case 'pending':
      case 'in_progress':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
      case 'failed':
      case 'failure':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin absolute top-2 left-1/2 transform -translate-x-1/2 animate-pulse"></div>
          </div>
          <p className="text-slate-600 font-medium">Chargement du rapport...</p>
        </div>
      </div>
    );
  }

  if (error || !rapport) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Erreur</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="space-y-2 text-sm text-slate-500 mb-6">
              <p>ID recherché: <code className="bg-slate-100 px-2 py-1 rounded">{testId}</code></p>
              <p>Vérifiez que l'ID du rapport est correct</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calcul des statistiques des étapes
  const stepStats = {
    total: filteredSteps.length,
    success: filteredSteps.filter(s => s.status === 'success' || s.status === 'completed').length,
    error: filteredSteps.filter(s => ['error', 'failed', 'failure'].includes(s.status)).length,
    warning: filteredSteps.filter(s => 
      !['success', 'completed', 'error', 'failed', 'failure'].includes(s.status)
    ).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-sm bg-white/80 border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors group"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Retour</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Rapport de Test</h1>
                <p className="text-slate-600">{rapport.module} • {rapport.scenario}</p>
              </div>
            </div>
            
            <button
              onClick={handleDownload}
              disabled={downloading || !rapport?.pdf_id}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Métriques principales */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Hash className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">ID du Test</p>
                    <p className="text-lg font-bold text-slate-800 truncate" title={testId}>
                      {testId?.length > 12 ? `${testId.substring(0, 12)}...` : testId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    rapport.success 
                      ? 'bg-gradient-to-br from-green-500 to-green-600' 
                      : 'bg-gradient-to-br from-red-500 to-red-600'
                  }`}>
                    {rapport.success ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <XCircle className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Statut</p>
                    <p className={`text-lg font-bold ${
                      rapport.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {rapport.success ? 'Succès' : 'Échec'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Timer className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Durée</p>
                    <p className="text-lg font-bold text-slate-800">
                      {rapport.execution_time?.toFixed(1) || 'N/A'}s
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Créé le</p>
                    <p className="text-sm font-bold text-slate-800">
                      {new Date(rapport.date_creation).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(rapport.date_creation).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informations du Test
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Module</p>
                    <p className="text-slate-800 font-semibold bg-slate-100 px-3 py-2 rounded-lg">
                      {rapport.module}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Scénario</p>
                    <p className="text-slate-800 font-semibold bg-slate-100 px-3 py-2 rounded-lg">
                      {rapport.scenario}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Nom du fichier</p>
                    <p className="text-slate-800 font-semibold bg-slate-100 px-3 py-2 rounded-lg truncate" title={rapport.filename}>
                      {rapport.filename}
                    </p>
                  </div>
                  {rapport.original_test_id && (
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-1">ID Original</p>
                      <p className="text-slate-800 font-semibold bg-slate-100 px-3 py-2 rounded-lg truncate" title={rapport.original_test_id}>
                        {rapport.original_test_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques des étapes */}
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Statistiques
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Succès</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-800">{stepStats.success}</span>
                    <p className="text-xs text-green-600">
                      {stepStats.total > 0 ? Math.round((stepStats.success / stepStats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Échecs</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-800">{stepStats.error}</span>
                    <p className="text-xs text-red-600">
                      {stepStats.total > 0 ? Math.round((stepStats.error / stepStats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Avertissements</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-yellow-800">{stepStats.warning}</span>
                    <p className="text-xs text-yellow-600">
                      {stepStats.total > 0 ? Math.round((stepStats.warning / stepStats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section des étapes */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="h-6 w-6" />
                Détail des Étapes
                <span className="ml-2 bg-slate-200 text-slate-700 text-sm font-medium px-3 py-1 rounded-full">
                  {filteredSteps.length}
                </span>
              </h2>
              
              {/* Légende */}
              <div className="hidden md:flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-slate-600">Succès</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-slate-600">Échec</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-slate-600">Avertissement</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredSteps.length > 0 ? (
              <div className="space-y-4">
                {filteredSteps.map((step, idx) => (
                  <div 
                    key={idx}
                    className="relative group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Numéro de l'étape */}
                      <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 group-hover:bg-slate-200 transition-colors">
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {/* Description */}
                        <div>
                          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                            <Play className="h-4 w-4 text-slate-500" />
                            Description
                          </h4>
                          <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg">
                            {step.description}
                          </p>
                        </div>

                        {/* Statut et résultat */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-slate-600 mb-2 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Statut
                            </h5>
                            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border font-medium ${getStatusColor(step.status)}`}>
                              {getStatusIcon(step.status)}
                              {step.status}
                            </div>
                          </div>
                          
                          <div>
                            <h5 className="font-medium text-slate-600 mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Résultat
                            </h5>
                            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">
                              {step.result}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 rounded-b-xl overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          ['success', 'completed'].includes(step.status) ? 'bg-green-400' : 
                          ['error', 'failed', 'failure'].includes(step.status) ? 'bg-red-400' : 'bg-yellow-400'
                        }`}
                        style={{ width: `${((idx + 1) / filteredSteps.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Layers className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-lg">Aucune étape trouvée pour ce rapport</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default RapportPage;
