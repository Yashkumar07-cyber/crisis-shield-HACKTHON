import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.12:5001';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
});

export const fetchAlerts = () => api.get('/api/alerts').then((r) => r.data.alerts);

export const resolveAlert = (id) =>
  api.patch(`/api/alerts/${id}/resolve`).then((r) => r.data.alert);

export default api;