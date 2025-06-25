import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, BarChart3, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Constantes
const API_URL = 'http://localhost:3001/api';
const COLORS = ['#10B981', '#EF4444'];

// Sous-composant pour l'en-tête
const Header = ({ onRefresh }) => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600 mt-2">Vue d'ensemble de vos tests automatisés</p>
    </div>
    <button 
      onClick={onRefresh} 
      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center"
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Rafraîchir
    </button>
  </div>
);

// Sous-composant pour les cartes de statistiques
const StatsCards = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
      <div className="flex items-center">
        <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
        <div>
          <p className="text-gray-600 text-sm font-medium">Tests Réussis</p>
          <p className="text-3xl font-bold text-gray-900">{stats.successCount || 0}</p>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
      <div className="flex items-center">
        <XCircle className="h-8 w-8 text-red-500 mr-3" />
        <div>
          <p className="text-gray-600 text-sm font-medium">Tests Échoués</p>
          <p className="text-3xl font-bold text-gray-900">{stats.failureCount || 0}</p>
        </div>
      </div>
    </div>
    
    <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
      <div className="flex items-center">
        <BarChart3 className="h-8 w-8 text-blue-500 mr-3" />
        <div>
          <p className="text-gray-600 text-sm font-medium">Total Tests</p>
          <p className="text-3xl font-bold text-gray-900">{(stats.successCount || 0) + (stats.failureCount || 0)}</p>
        </div>
      </div>
    </div>
  </div>
);

// Sous-composant pour la liste des rapports
const ReportsList = ({ reports, onClickReport }) => (
  <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
    <div className="flex items-center mb-4">
      <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
      <h2 className="text-xl font-bold text-gray-900">5 derniers rapports</h2>
    </div>
    
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
            <th className="text-left py-3 px-4 font-semibold text-gray-700">Date de création</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report, index) => (
            <tr 
              onClick={() => onClickReport(report._id)} 
              key={report._id} 
              className={`cursor-pointer transition-colors duration-200 hover:bg-blue-50 hover:shadow-sm ${
                index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <td className="py-3 px-4 text-gray-900 font-mono text-sm">{report._id}</td>
              <td className="py-3 px-4"> 
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  report.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {report.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {report.status}
                </span>
              </td>
              <td className="py-3 px-4 text-gray-600">{new Date(report.date_creation).toLocaleDateString('fr-FR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Sous-composant pour les graphiques
const Charts = ({ stats }) => {
  const pieData = [
    { name: 'Réussis', value: stats.successCount || 0 },
    { name: 'Échoués', value: stats.failureCount || 0 },
  ];

  const barData = [
    { name: 'Réussis', count: stats.successCount || 0 },
    { name: 'Échoués', count: stats.failureCount || 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Répartition des tests</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie 
              data={pieData} 
              cx="50%" 
              cy="50%" 
              outerRadius={100} 
              fill="#8884d8" 
              dataKey="value"
              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Nombre de tests</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fill: '#6B7280' }} />
            <YAxis tick={{ fill: '#6B7280' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }} 
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API_URL}/rapport`);
      setReports(res.data.rapports.slice(0, 5));
    } catch (err) {
      setError('Erreur lors du chargement des rapports');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/stats`);
      setStats(res.data);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await fetchReports();
      await fetchStats();
    } catch (err) {
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleClickReport = (reportId) => {
    // Redirection vers la page de détails du rapport
    window.location.href = `/reports/${reportId}`;
  };

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Chargement des rapports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Header onRefresh={handleRefresh} />
        <StatsCards stats={stats} />
        <ReportsList reports={reports} onClickReport={handleClickReport} />
        <Charts stats={stats} />
      </div>
    </div>
  );
};

export default Dashboard;