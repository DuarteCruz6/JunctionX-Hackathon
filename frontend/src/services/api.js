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

  try {
    const resp = await api.post('/api/v1/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return resp.data;
  } catch (error) {
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      if (errorData && errorData.detail) {
        // Backend validation error (e.g., invalid file format)
        throw new Error(`Upload failed: ${errorData.detail.error || errorData.detail}`);
      } else {
        throw new Error(`Upload failed: ${error.response.statusText}`);
      }
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to connect to server');
    } else {
      // Other error
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}

export async function getUserReports() {
  try {
    const resp = await api.get('/api/v1/reports');
    return resp.data;
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(`Failed to fetch reports: ${errorData.detail || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }
  }
}

export async function getPredictionResults(imageId) {
  try {
    const resp = await api.get(`/api/v1/predict/${imageId}/results`);
    return resp.data;
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(`Failed to fetch results: ${errorData.detail || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw new Error(`Failed to fetch results: ${error.message}`);
    }
  }
}

export async function runPrediction(imageId) {
  try {
    const resp = await api.post(`/api/v1/predict/${imageId}`);
    return resp.data;
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(`Prediction failed: ${errorData.detail || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw new Error(`Prediction failed: ${error.message}`);
    }
  }
}

export async function downloadImage(imageId) {
  try {
    const resp = await api.get(`/api/v1/download/${imageId}`, {
      responseType: 'blob' // Important: tells axios to handle binary data
    });
    return resp.data; // Returns the blob
  } catch (error) {
    if (error.response) {
      const errorData = error.response.data;
      throw new Error(`Download failed: ${errorData.detail || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Network error: Unable to connect to server');
    } else {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}

export default api;
