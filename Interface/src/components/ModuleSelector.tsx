import React from 'react';
import { useNavigate } from 'react-router-dom';
import ScenarioActions from './ScenarioActions';

const modules = [
  { id: 'SID', name: 'SID', description: 'System Integration & Deployment' },
  { id: 'COX200M', name: 'COX200M', description: 'module contensieux' },

  { id: 'CRM', name: 'CRM', description: 'Customer Relationship Management' },
  { id: 'FIN', name: 'Finance', description: 'Financial Management' },
  { id: 'HR', name: 'HR', description: 'Human Resources' },
];

const ModuleSelector: React.FC = () => {
  const navigate = useNavigate();

  const handleModuleSelect = (moduleId: string) => {
    navigate(`/modules/${moduleId}/scenarios`);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <div key={module.id} className="relative bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <button
              onClick={() => handleModuleSelect(module.id)}
              className="w-full p-6 text-left"
            >
              <h2 className="text-xl font-bold mb-2">{module.name}</h2>
              <p className="text-gray-600">{module.description}</p>
            </button>
            <div className="absolute top-2 right-2">
              <ScenarioActions moduleId={module.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModuleSelector;