import axios from 'axios';
import { getAuth } from 'firebase/auth';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/',
  timeout: 120000,
});

// Attach Firebase ID token to requests when available
api.interceptors.request.use(async (config) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Failed to attach Firebase token', err);
  }
  return config;
});

export async function uploadImages(files) {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  const resp = await api.post('/api/v1/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return resp.data;
}

export default api;
