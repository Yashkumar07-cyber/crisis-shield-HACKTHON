import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'https://crisis-shield-hackthon.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
  },
});

export const fetchAlerts = () => api.get('/api/alerts').then((r) => r.data.alerts);

export const resolveAlert = (id) =>
  api.patch(`/api/alerts/${id}/resolve`).then((r) => r.data.alert);

export default api;