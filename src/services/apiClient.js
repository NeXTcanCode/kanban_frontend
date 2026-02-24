import axios from "axios";
import { getStoredToken } from "./authStorage";

const DEFAULT_API_URL = "https://kanban-backend-1-ppuj.onrender.com/api";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  timeout: 60000
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
