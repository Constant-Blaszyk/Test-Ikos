import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ScenarioActions from './ScenarioActions';

const couleurs = [
  { bg: 'from-pink-400 to-pink-600', accent: 'pink-200' },
  { bg: 'from-green-400 to-green-600', accent: 'green-200' },
  { bg: 'from-blue-400 to-blue-600', accent: 'blue-200' },
  { bg: 'from-orange-400 to-orange-600', accent: 'orange-200' },
  { bg: 'from-yellow-400 to-yellow-600', accent: 'yellow-200' },
  { bg: 'from-teal-400 to-teal-600', accent: 'teal-200' },
  { bg: 'from-purple-400 to-purple-600', accent: 'purple-200' },
  { bg: 'from-indigo-400 to-indigo-600', accent: 'indigo-200' },
  { bg: 'from-red-400 to-red-600', accent: 'red-200' },
  { bg: 'from-cyan-400 to-cyan-600', accent: 'cyan-200' },
];

interface Formation {
  titre: string;
  description: string;
  statut: string;
  type: string;
  formateur: string;
  date: string;
}

interface Module {
  id: string;
  name: string;
  code: string;
  formations: Formation[];
  couleur: {
    bg: string;
    accent: string;
  };
}

const ModuleSelector: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModules = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch('http://10.110.6.139:3001/api/modules');
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        const modulesData = data.map((m: any, index: number) => ({
          id: m._id,
          name: m.module,
          code: m.module, // Le code est le même que le nom du module
          formations: m.formations || [],
          couleur: couleurs[index % couleurs.length],
        }));
        
        setModules(modulesData);
      } catch (error: any) {
        console.error('Erreur lors de la récupération des modules:', error);
        
        if (error.message.includes('Failed to fetch')) {
          setError('Erreur réseau. Vérifiez que le serveur est accessible sur http://10.110.6.139:3001');
        } else {
          setError(error.message || 'Erreur lors du chargement des modules');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchModules();
  }, []);

  const handleModuleSelect = (moduleCode: string) => {
    // Utiliser le code du module au lieu de l'ID
    navigate(`/api/modules/ref/${moduleCode}`, {
      state: { moduleCode },
    });

  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-slate-600 font-medium">Chargement des modules...</span>
          </div>
          <p className="text-slate-500 text-sm">Connexion au serveur...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Erreur de connexion</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Modules IKOS
            </h1>
            <p className="text-slate-600 text-lg">
              Sélectionnez un module pour accéder aux scénarios
            </p>
            <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        {modules.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Aucun module disponible</h3>
            <p className="text-slate-500">Les modules de formation apparaîtront ici une fois créés.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {modules.map((mod, index) => (
              <div
                key={mod.id}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mod.couleur.bg}`}>
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 opacity-20">
                    <div className="w-full h-full rounded-full bg-white"></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-20 h-20 transform -translate-x-4 translate-y-4 opacity-20">
                    <div className="w-full h-full rounded-full bg-white"></div>
                  </div>
                </div>

                {/* Content */}
                <button
                  onClick={() => handleModuleSelect(mod.code)}
                  className="relative w-full h-80 p-6 text-left flex flex-col justify-between hover:scale-105 transition-transform duration-200"
                  title={`Accéder au module ${mod.name}`}
                >
                  {/* Module title */}
                  <div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="w-3 h-3 bg-white rounded-full opacity-80"></div>
                      <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                      <div className="w-1 h-1 bg-white rounded-full opacity-40"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2 leading-tight group-hover:text-opacity-90 transition-all">
                      {mod.name}
                    </h2>
                    <div className="text-white/80 text-sm font-medium mb-4">
                      Code: {mod.code}
                    </div>
                  </div>

                  {/* Formations list */}
                  <div className="space-y-3">
                    <div className="text-white/90 text-sm font-medium mb-2 flex items-center justify-between">
                      <span>Scénarios disponibles:</span>
                      <span className="bg-white/30 px-2 py-1 rounded-full text-xs">
                        {mod.formations.length}
                      </span>
                    </div>
                    
                    {mod.formations.length === 0 ? (
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white/70 border border-white/20 italic">
                        Aucun scénario créé
                      </div>
                    ) : (
                      <>
                        {mod.formations.slice(0, 3).map((formation, formationIndex) => (
                          <div
                            key={formationIndex}
                            className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white border border-white/30"
                          >
                            <div className="truncate font-medium">
                              {formation.titre}
                            </div>
                            <div className="text-xs text-white/70 mt-1 flex items-center space-x-2">
                              <span className="capitalize">{formation.type}</span>
                              {formation.statut && (
                                <>
                                  <span>•</span>
                                  <span className={`capitalize ${
                                    formation.statut.toLowerCase() === 'actif' ? 'text-green-200' :
                                    formation.statut.toLowerCase() === 'en cours' ? 'text-yellow-200' :
                                    'text-red-200'
                                  }`}>
                                    {formation.statut}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        {mod.formations.length > 3 && (
                          <div className="text-white/80 text-sm font-medium bg-white/10 rounded-lg px-3 py-2 border border-white/20">
                            + {mod.formations.length - 3} autres scénarios
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Actions */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1">
                    <ScenarioActions moduleId={mod.id} moduleCode={mod.code} />
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none"></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {modules.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm border-t border-slate-200/60 mt-16">
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-2xl font-bold text-slate-800">{modules.length}</div>
                <div className="text-sm text-slate-600">Modules</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">
                  {modules.reduce((total, mod) => total + mod.formations.length, 0)}
                </div>
                <div className="text-sm text-slate-600">Scénarios</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {modules.reduce((total, mod) => 
                    total + mod.formations.filter(f => f.statut?.toLowerCase() === 'actif').length, 0
                  )}
                </div>
                <div className="text-sm text-slate-600">Actifs</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {new Set(modules.flatMap(mod => mod.formations.map(f => f.type))).size}
                </div>
                <div className="text-sm text-slate-600">Types différents</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleSelector;