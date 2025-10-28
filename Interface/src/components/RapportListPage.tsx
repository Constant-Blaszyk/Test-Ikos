import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Search,
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  Loader2,
  BarChart3,
  Target,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const RapportListPage: React.FC = () => {
  const [rapports, setRapports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('desc'); // 'asc', 'desc', 'none'

  const modules = Array.from(new Set(rapports.map(r => r.module))).sort();

  useEffect(() => {
    const fetchRapports = async () => {
      try {
        const res = await axios.get('http://172.16.8.23:5000/api/rapport');
        setRapports(res.data.rapports || []);
      } finally {
        setLoading(false);
      }
    };
    fetchRapports();
  }, []);

  // Filtrage avec recherche et tri
  const filteredAndSortedRapports = rapports
    .filter(r => {
      const moduleOk = moduleFilter === 'all' || r.module === moduleFilter;
      const statusOk =
        statusFilter === 'all' ||
        (statusFilter === 'success' && r.success) ||
        (statusFilter === 'fail' && !r.success);
      const searchOk = searchTerm === '' || 
        r.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.test_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return moduleOk && statusOk && searchOk;
    })
    .sort((a, b) => {
      if (sortOrder === 'none') return 0;
      
      const dateA = new Date(a.date_creation || 0).getTime();
      const dateB = new Date(b.date_creation || 0).getTime();
      
      if (sortOrder === 'asc') {
        return dateA - dateB;
      } else if (sortOrder === 'desc') {
        return dateB - dateA;
      }
      return 0;
    });

  // Fonction pour changer l'ordre de tri
  const handleSortChange = () => {
    const nextSort = {
      'desc': 'asc',
      'asc': 'none', 
      'none': 'desc'
    };
    setSortOrder(nextSort[sortOrder as keyof typeof nextSort]);
  };

  // Icône et texte pour le bouton de tri
  const getSortIcon = () => {
    switch (sortOrder) {
      case 'asc': return <ArrowUp className="h-4 w-4" />;
      case 'desc': return <ArrowDown className="h-4 w-4" />;
      default: return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  const getSortText = () => {
    switch (sortOrder) {
      case 'asc': return 'Date croissante';
      case 'desc': return 'Date décroissante';
      default: return 'Trier par date';
    }
  };

  // Statistiques (basées sur les rapports filtrés)
  const stats = {
    total: rapports.length,
    success: rapports.filter(r => r.success).length,
    fail: rapports.filter(r => !r.success).length,
    avgTime: rapports.length > 0 ? 
      (rapports.reduce((sum, r) => sum + (r.execution_time || 0), 0) / rapports.length).toFixed(1) : 0
  };

  const successRate = rapports.length > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-pulse"></div>
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin absolute top-4 left-4" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Chargement des rapports</h2>
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
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Rapports de Tests</h1>
              <p className="text-slate-600">Analyse des résultats de vos scénarios de formation</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800">{filteredAndSortedRapports.length}</div>
                <div className="text-sm text-slate-500">rapports trouvés</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Rapports</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Succès</p>
                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                <p className="text-xs text-slate-500">{successRate}% de réussite</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Échecs</p>
                <p className="text-2xl font-bold text-red-600">{stats.fail}</p>
                <p className="text-xs text-slate-500">{(100 - parseFloat(successRate)).toFixed(1)}% d'échec</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Temps Moyen</p>
                <p className="text-2xl font-bold text-purple-600">{stats.avgTime}s</p>
                <p className="text-xs text-slate-500">par test</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres et Tri
            </h2>
            <div className="text-sm text-slate-500">
              {filteredAndSortedRapports.length} sur {rapports.length} rapports
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              />
            </div>

            {/* Module Filter */}
            <div>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              >
                <option value="all">Tous les modules</option>
                {modules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="success">Succès uniquement</option>
                <option value="fail">Échecs uniquement</option>
              </select>
            </div>

            {/* Sort Button */}
            <div>
              <button
                onClick={handleSortChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 flex items-center justify-center gap-2 font-medium
                  ${sortOrder !== 'none' 
                    ? 'border-blue-300 text-blue-700 bg-blue-50/50' 
                    : 'border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
              >
                {getSortIcon()}
                <span className="text-sm">{getSortText()}</span>
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(moduleFilter !== 'all' || statusFilter !== 'all' || searchTerm || sortOrder !== 'none') && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-slate-600 font-medium">Filtres actifs :</span>
                {moduleFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Module: {moduleFilter}
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Statut: {statusFilter === 'success' ? 'Succès' : 'Échec'}
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Recherche: "{searchTerm}"
                  </span>
                )}
                {sortOrder !== 'none' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {getSortText()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reports Grid */}
        {filteredAndSortedRapports.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
              <BarChart3 className="w-16 h-16 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-4">Aucun rapport trouvé</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Aucun rapport ne correspond à vos critères de recherche. Essayez de modifier les filtres.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedRapports.map((r, index) => (
              <Link
                to={`/reports/${r._id}`}
                key={r._id}
                className="group bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-xl hover:bg-white/90 transition-all duration-300 transform hover:-translate-y-1"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {r.module}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full 
                      ${r.success 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                      {r.success ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Succès
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Échec
                        </>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">
                        {r.scenario}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 font-mono bg-slate-50 px-2 py-1 rounded">
                        {r.test_id}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Créé le</p>
                          <p className="font-medium">
                            {r.date_creation 
                              ? new Date(r.date_creation).toLocaleDateString('fr-FR') 
                              : 'N/A'
                            }
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.date_creation 
                              ? new Date(r.date_creation).toLocaleTimeString('fr-FR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : ''
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-500">Durée</p>
                          <p className="font-medium">
                            {r.execution_time ? `${r.execution_time.toFixed(1)}s` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Indicator */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Performance</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${r.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-medium text-slate-600">
                          {r.success ? 'Optimal' : 'À améliorer'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RapportListPage;
