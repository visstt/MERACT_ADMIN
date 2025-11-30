import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add access token to every request if present
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access") || sessionStorage.getItem("access");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  // Если это FormData, удаляем Content-Type чтобы браузер установил правильный с boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Interceptor for refreshing token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await api.get("/auth/refresh");
        // If server returns new access token, save it (if needed)
        if (refreshRes.data?.access) {
          localStorage.setItem("access", refreshRes.data.access);
          sessionStorage.setItem("access", refreshRes.data.access);
        }
        // Repeat original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails — redirect to login or handle logout
        window.location.href = "/admin/sign-in";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export function getImageUrl(type, filename) {
  if (!filename) return "";
  // Если filename уже полный URL, возвращаем его напрямую
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }
  return `${api.defaults.baseURL}/image/photo/${type}/${filename}`;
}

export default api;
