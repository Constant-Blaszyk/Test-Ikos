import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthForm from './components/AuthForm';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TestDetails from './components/TestDetails';
import ModuleSelector from './components/ModuleSelector';
import TestScenarioSelector from './components/TestScenarioSelector';
import Navbar from './components/Navbar';
import { TestProvider } from './context/TestContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Register from './components/Register';
import ModuleForm from './components/ModuleForm';
import ScenarioDetail from './components/ScenarioDetail';
import ScenarioEdit from './components/ScenarioEdit';
import TestProgressPage from './components/TestProgressPage';
import RapportPage from './components/RapportPage';
import RapportListPage from './components/RapportListPage';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <TestProvider>
        <div className="min-h-screen bg-gray-50">
          {window.location.pathname !== '/' && window.location.pathname !== '/register' && <Navbar />}
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/modules"
                element={
                  <PrivateRoute>
                    <ModuleSelector />
                  </PrivateRoute>
                }
              />
              <Route
                path="/modules/:moduleId/scenarios"
                element={
                  <PrivateRoute>
                    <TestScenarioSelector />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/test/:testId"
                element={
                  <PrivateRoute>
                    <TestDetails />
                  </PrivateRoute>
                }
              />
              <Route path="/auth" element={<AuthForm />} />
              <Route
                path="/module/:moduleId/edit"
                element={
                  <PrivateRoute>
                    <ModuleForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/modules/:moduleId/scenarios/:scenarioId"
                element={
                  <PrivateRoute>
                    <ScenarioDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/modules/:moduleId/scenarios/:scenarioId/edit"
                element={
                  <PrivateRoute>
                    <ScenarioEdit />
                  </PrivateRoute>
                }
              />
              <Route
                path="/modules/:moduleId/scenarios/:scenarioId/run"
                element={
                  <PrivateRoute>
                    <TestProgressPage />
                  </PrivateRoute>
                }
              />
              <Route path="/rapport" element={<RapportListPage />} />
              <Route path="/rapport/:filename" element={<RapportPage />} />
            </Routes>
          </div>
          <ToastContainer position="bottom-right" />
        </div>
      </TestProvider>
    </Router>
  );
}

export default App;