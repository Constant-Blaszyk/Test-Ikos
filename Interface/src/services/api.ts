import axios, { AxiosInstance } from 'axios';
import { Test } from '../types';
import { toast } from 'react-toastify';

// Configure axios with base URL
export const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`Response received from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      
      // Handle specific error cases
      if (error.response.status === 404) {
        toast.error(`Endpoint not found: ${error.config?.url}`);
      } else if (error.response.status >= 500) {
        toast.error('Server error. Please try again later.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
      toast.error('Server not responding. Please check your connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request error:', error.message);
      toast.error(`Request failed: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

// Alternative API instance without credentials for testing
export const apiWithoutCredentials: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disable credentials
});

// Get test history
export const getTestHistory = async (): Promise<Test[]> => {
  try {
    const response = await api.get('/api/tests');
    return response.data;
  } catch (error) {
    console.error('Error fetching test history:', error);
    throw error;
  }
};

// Start a new test
export const startNewTest = async (testId: string): Promise<any> => {
  try {
    const response = await api.post(`/api/start-test/${testId}`);
    return response.data;
  } catch (error) {
    console.error('Error starting test:', error);
    throw error;
  }
};

// Get test results
export const getTestResults = async (testId: string): Promise<Test> => {
  try {
    const response = await api.get(`/api/test-results/${testId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching test results:', error);
    throw error;
  }
};

// Get specific scenario - using the correct endpoint
export const fetchScenario = async (moduleId: string, scenarioId: string): Promise<any> => {
  try {
    console.log(`Fetching scenario: moduleId=${moduleId}, scenarioId=${scenarioId}`);
    const response = await api.get(`/api/modules/${moduleId}/scenarios/${scenarioId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching scenario:', error);
    
    // Try alternative approach without credentials if the first attempt fails
    if (error.code === 'ERR_NETWORK') {
      console.log('Retrying without credentials...');
      try {
        const response = await apiWithoutCredentials.get(`/api/modules/${moduleId}/scenarios/${scenarioId}`);
        return response.data;
      } catch (retryError) {
        console.error('Retry also failed:', retryError);
        throw retryError;
      }
    }
    throw error;
  }
};

// Download test report
export const downloadReport = async (pdfId: string): Promise<void> => {
  try {
    const response = await api.get(`/download/${pdfId}`, {
      responseType: 'blob',
    });
    
    // Create a blob URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${pdfId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

// Get a specific test report
export const getTestReport = async (testId: string): Promise<any> => {
  try {
    const response = await api.get(`/api/rapport/${testId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching test report:', error);
    throw error;
  }
};