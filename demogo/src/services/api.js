import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const apiClient = axios.create({
  baseURL: backendUrl,
  timeout: 15000,
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Authentication - Register new user
 */
export const registerUser = async (userData) => {
  const res = await apiClient.post('/api/auth/register', userData);
  if (res.data.token) {
    localStorage.setItem('authToken', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  }
  return res.data;
};

/**
 * Authentication - Login user
 */
export const loginUser = async (phoneNumber, password) => {
  const res = await apiClient.post('/api/auth/login', {
    phoneNumber,
    password,
  });
  if (res.data.token) {
    localStorage.setItem('authToken', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
  }
  return res.data;
};

/**
 * Authentication - Logout user
 */
export const logoutUser = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Analysis API - submit leaf image for disease detection
 */
export const submitAnalysis = async (image, cropType = 'auto', location = {}) => {
  const form = new FormData();
  form.append('image', image);
  form.append('cropType', cropType);
  if (location.latitude && location.longitude) {
    form.append('location', JSON.stringify(location));
  }
  const res = await apiClient.post('/api/analyze/upload', form);
  return res.data;
};

/**
 * Health Check - verify backend connectivity
 */
export const checkBackendHealth = async () => {
  try {
    const res = await apiClient.get('/api/health');
    return { status: 'ok', data: res.data };
  } catch (error) {
    return { status: 'error', error };
  }
};

/**
 * Get list of supported crops and diseases
 */
export const getCrops = async () => {
  const res = await apiClient.get('/api/crops');
  return res.data;
};

/**
 * Get diseases by crop or all diseases
 */
export const getDiseases = async (cropFilter = null) => {
  const url = cropFilter ? `/api/diseases?crop=${cropFilter}` : '/api/diseases';
  const res = await apiClient.get(url);
  return res.data;
};

/**
 * LLM Chat - send message to AI backend
 * Note: This is a passthrough to the Node backend's LLM integration
 */
export const sendChatMessage = async (message, context = {}) => {
  const res = await apiClient.post('/api/chat', {
    message,
    context,
  });
  return res.data;
};

/**
 * Fetch disease statistics for a region
 * Returns mock/simulated data based on location
 */
export const getDiseaseStats = async (latitude = null, longitude = null) => {
  try {
    const params = {};
    if (latitude && longitude) {
      params.lat = latitude;
      params.lon = longitude;
    }
    const res = await apiClient.get('/api/disease-stats', { params });
    return res.data;
  } catch (error) {
    // Fallback to mock data if endpoint doesn't exist yet
    console.warn('Disease stats endpoint not available, returning mock data');
    return {
      zones: [
        { id: 'zone1', name: 'Northern Region', risk: 'High', affected: 35, diseases: 5 },
        { id: 'zone2', name: 'Central Area', risk: 'Moderate', affected: 18, diseases: 3 },
        { id: 'zone3', name: 'Southern Zone', risk: 'Low', affected: 5, diseases: 1 },
      ],
      timestamp: new Date().toISOString(),
    };
  }
};

export default apiClient;
