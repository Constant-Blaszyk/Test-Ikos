import axios from 'axios';

const API_URL = 'http://10.110.6.139:3001/api/modules';

export interface Scenario {
  _id: string;
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

export const createScenario = async (moduleId: string, scenario: Partial<Scenario>) => {
  const response = await axios.post(`${API_URL}/${moduleId}/scenarios`, scenario);
  return response.data;
};

export const updateScenario = async (moduleId: string, scenarioId: string, scenario: Partial<Scenario>) => {
  const response = await axios.put(`${API_URL}/${moduleId}/scenarios/${scenarioId}`, scenario);
  return response.data;
};

export const deleteScenario = async (moduleId: string, scenarioId: string) => {
  const response = await axios.delete(`${API_URL}/${moduleId}/scenarios/${scenarioId}`);
  return response.data;
};