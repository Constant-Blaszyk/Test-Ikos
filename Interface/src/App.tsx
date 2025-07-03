import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Dashboard from './components/Dashboard';
import TestDetails from './components/TestDetails';
import ModuleSelector from './components/ModuleSelector';
import TestScenarioSelector from './components/TestScenarioSelector';
import Navbar from './components/Navbar';
import { TestProvider } from './context/TestContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ModuleForm from './components/ModuleForm';
import ScenarioDetail from './components/ScenarioDetail';
import ScenarioEdit from './components/ScenarioEdit';
import TestProgressPage from './components/TestProgressPage';
import RapportPage from './components/RapportPage';
import RapportListPage from './components/RapportListPage';
import PatchesPage from './components/PatchesPage';



function App() {
  return (
    <Router>
      <TestProvider>
        <div className="min-h-screen bg-gray-50">
          {window.location.pathname !== '/' && window.location.pathname !== '/register' && <Navbar />}
          <div className="container mx-auto px-4 py-8">
            <Routes>
              <Route
                path="/"
                element={
                  <Navigate to="/dashboard" replace />
                }
              />
              <Route
                path="/modules"
                element={
                    <ModuleSelector />
                }
              />
              <Route
                path="/modules/:moduleId/scenarios"
                element={
                    <TestScenarioSelector />
                }
              />

              <Route
                path="api/modules/ref/:moduleId"
                element={
                    <TestScenarioSelector />
                }
              />
              <Route
                path="/dashboard"
                element={
                    <Dashboard />
                }
              />
              <Route
                path="/test/:testId"
                element={
                    <TestDetails />
                }
              />
              <Route
                path="/module/:moduleId/edit"
                element={
                    <ModuleForm />
                }
              />
              <Route
                path="/modules/:moduleId/scenarios/:scenarioId"
                element={
                    <ScenarioDetail />
                }
              />
              <Route
                path="/modules/:moduleId/scenarios/:scenarioId/edit"
                element={
                    <ScenarioEdit />

                  }
              />
              <Route
                path="/modules/:moduleId/scenarios/:scenarioId/run"
                element={
                    <TestProgressPage />
                }
              />
              <Route path="/reports" element={<RapportListPage />} />
              <Route path="/reports/:testId" element={<RapportPage />} />
               <Route path="/patch" element={<PatchesPage/>} />
            </Routes>
          </div>
          <ToastContainer position="bottom-right" />
        </div>
      </TestProvider>
    </Router>
  );
}

export default App;