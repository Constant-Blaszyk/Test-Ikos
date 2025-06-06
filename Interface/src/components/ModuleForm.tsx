import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface Formation {
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

interface ModuleData {
  _id: string;
  module: string;
  date_creation: string;
  formations: Formation[];
  nombre_formations: number;
}

const ModuleForm: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/modules/${moduleId}`);
        setModuleData(response.data);
      } catch (error) {
        console.error('Error fetching module:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModule();
  }, [moduleId]);

  const handleFormationChange = (index: number, field: keyof Formation, value: string) => {
    if (!moduleData) return;

    const newFormations = [...moduleData.formations];
    newFormations[index] = {
      ...newFormations[index],
      [field]: value
    };

    setModuleData({
      ...moduleData,
      formations: newFormations
    });
  };

  const handleSubmit = async () => {
    try {
      await axios.put(`http://localhost:3001/api/modules/${moduleId}`, moduleData);
      alert('Module updated successfully!');
    } catch (error) {
      console.error('Error updating module:', error);
      alert('Error updating module');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (!moduleData) return <div>Module not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Module {moduleData.module}</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <p><strong>ID:</strong> {moduleData._id}</p>
        <p><strong>Date de création:</strong> {new Date(moduleData.date_creation).toLocaleString()}</p>
      </div>

      {moduleData.formations.map((formation, index) => (
        <div key={index} className="border p-4 rounded mb-4">
          <h2 className="text-xl font-semibold mb-2">Formation {index + 1}</h2>
          
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(formation).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700">
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFormationChange(index, key as keyof Formation, e.target.value)}
                  className="mt-1 block w-full rounded border-gray-300 shadow-sm"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Sauvegarder les modifications
      </button>
    </div>
  );
};

export default ModuleForm;