import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  password: string;
  email: string;
}

export const login = async (credentials: LoginCredentials) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('isAuthenticated', 'true');
  }
  return response.data;
};

export const register = async (credentials: RegisterCredentials) => {
  const response = await axios.post(`${API_URL}/auth/register`, credentials);
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('isAuthenticated', 'true');
  }
  return response.data;
};