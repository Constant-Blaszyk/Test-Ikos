import axios from 'axios';

// Configuration de base d'Axios
const apiClient = axios.create({
  baseURL: 'http://10.110.6.139:3001',
  timeout: 10000,
  // FIX: Seulement si vous avez besoin d'envoyer des cookies/credentials
  // withCredentials: true, // Commentez si vous n'en avez pas besoin
});

// Intercepteur pour les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Logs détaillés pour debug
    if (error.response) {
      console.error('Error Response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Fonctions API
export const scenarioAPI = {
  // Récupérer tous les modules
  getAllModules: () => apiClient.get('/api/modules/all/scenarios'),
  
  // Récupérer les scénarios d'un module
  getScenarios: (moduleId: string) => 
    apiClient.get(`/api/modules/${moduleId}/scenarios`),
  
  // Récupérer un scénario spécifique
  getScenario: (moduleId: string, scenarioId: string) => 
    apiClient.get(`/api/modules/${moduleId}/scenarios/${encodeURIComponent(scenarioId)}`),
  
  // Créer un nouveau scénario
  createScenario: (moduleId: string, data: any) => 
    apiClient.post(`/api/modules/${moduleId}/scenarios`, data),
  
  // Mettre à jour un scénario
  updateScenario: (moduleId: string, scenarioId: string, data: any) => 
    apiClient.put(`/api/modules/${moduleId}/scenarios/${encodeURIComponent(scenarioId)}`, data),
  
  // Supprimer un scénario
  deleteScenario: (moduleId: string, scenarioId: string) => 
    apiClient.delete(`/api/modules/${moduleId}/scenarios/${encodeURIComponent(scenarioId)}`),
  
  // Créer un nouveau module
  createModule: (data: any) => 
    apiClient.post('/api/modules', data)
};

export default apiClient;