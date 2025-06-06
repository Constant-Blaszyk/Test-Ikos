import React, { useState } from 'react';
import { login, register, LoginCredentials, RegisterCredentials } from '../services/authService';

const AuthForm: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const loginData: LoginCredentials = {
          username: formData.username,
          password: formData.password
        };
        const response = await login(loginData);
        console.log('Login successful:', response);
      } else {
        const registerData: RegisterCredentials = {
          username: formData.username,
          password: formData.password,
          email: formData.email
        };
        const response = await register(registerData);
        console.log('Registration successful:', response);
      }
      // Redirect or update UI after successful auth
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="auth-form-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      <button 
        className="toggle-auth-mode" 
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </div>
  );
};

export default AuthForm;