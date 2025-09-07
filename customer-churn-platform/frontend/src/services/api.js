import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const apiService = {
  // Health check
  healthCheck: () => api.get('/health'),

  // Customer operations
  getCustomers: () => api.get('/api/customers'),
  
  // Predictions
  predictChurn: (data) => api.post('/api/predict/churn', data),
  predictCLV: (data) => api.post('/api/predict/clv', data),
  
  // Analytics
  getDashboardData: () => api.get('/api/analytics/dashboard'),
  
  // Model management
  trainModels: () => api.post('/api/train'),
  
  // ETL operations
  runETL: () => api.post('/api/etl/run'),
};

export default api;
