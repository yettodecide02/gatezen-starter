import axios from "axios";

// Axios instance with base configuration
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = user.jwttoken || localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "An error occurred";
    throw new Error(message);
  }
);

/**
 * API wrapper using axios
 * api("/announcements")          -> GET
 * api("/announcements", { method:"POST", data: {...} })
 */
export async function api(path, opts = {}) {
  const { method = "GET", data, ...config } = opts;

  const requestConfig = {
    method: method.toLowerCase(),
    url: path,
    ...config,
  };

  if (data) {
    requestConfig.data = data;
  }

  return axiosInstance(requestConfig);
}

export { API_URL };
