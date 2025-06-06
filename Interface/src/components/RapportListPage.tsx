import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';

const RapportListPage: React.FC = () => {
  const [rapports, setRapports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pour la liste déroulante des modules uniques
  const modules = Array.from(new Set(rapports.map(r => r.module))).sort();

  useEffect(() => {
    const fetchRapports = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/rapport');
        setRapports(res.data.rapports || []);
      } finally {
        setLoading(false);
      }
    };
    fetchRapports();
  }, []);

  // Filtrage
  const filteredRapports = rapports.filter(r => {
    const moduleOk = moduleFilter === 'all' || r.module === moduleFilter;
    const statusOk =
      statusFilter === 'all' ||
      (statusFilter === 'success' && r.success) ||
      (statusFilter === 'fail' && !r.success);
    return moduleOk && statusOk;
  });

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Liste des rapports</h1>
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="mr-2 font-medium">Module :</label>
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
        <div>
          <label className="mr-2 font-medium">Statut :</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="all" key="all">Tous</option>
            <option value="success" key="success">Succès</option>
            <option value="fail" key="fail">Échec</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filteredRapports.map(r => (
          <Link
            to={`/rapport/${r.filename}`}
            key={r._id}
            className="block bg-white rounded-lg shadow hover:shadow-lg transition p-5 border border-gray-100 hover:border-green-400"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileText className="text-green-600" />
                <span className="font-semibold">{r.module}</span>
              </div>
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded 
                ${r.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {r.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Succès
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Échec
                  </>
                )}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-800 mb-1">{r.scenario}</div>
            <div className="text-sm text-gray-500 mb-2">{r.test_id}</div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>
                Créé le : {r.date_creation ? new Date(r.date_creation).toLocaleString() : 'N/A'}
              </span>
              <span>
                Durée : {r.execution_time ? `${r.execution_time.toFixed(1)}s` : 'N/A'}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {filteredRapports.length === 0 && (
        <div className="text-gray-500 text-center mt-8">Aucun rapport trouvé.</div>
      )}
    </div>
  );
};

export default RapportListPage;