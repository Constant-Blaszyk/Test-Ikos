import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LogOut, Bug, FileText, LayoutDashboard } from 'lucide-react';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-green-700 text-white shadow' : 'text-green-50';
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  return (
    <nav className="bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Nom de l'application */}
          <div className="flex items-center space-x-4">
            <span className="text-2xl font-bold tracking-wide text-white mr-8">Test-Ikos</span>
            <Link
              to="/dashboard"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:bg-green-700 hover:text-white ${isActive(
                '/dashboard'
              )}`}
            >
              <LayoutDashboard className="h-5 w-5 mr-2" />
              Dashboard
            </Link>
            <Link
              to="/modules"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:bg-green-700 hover:text-white ${isActive(
                '/modules'
              )}`}
            >
              <Activity className="h-5 w-5 mr-2" />
              Modules
            </Link>
            <Link
              to="/bugs"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:bg-green-700 hover:text-white ${isActive(
                '/bugs'
              )}`}
            >
              <Bug className="h-5 w-5 mr-2" />
              Bug
            </Link>
            <Link
              to="/reports"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:bg-green-700 hover:text-white ${isActive(
                '/reports'
              )}`}
            >
              <FileText className="h-5 w-5 mr-2" />
              Rapport de test
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center px-3 py-2 rounded-md text-sm font-semibold bg-green-700 hover:bg-green-800 transition-all duration-200 shadow"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;