import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_LICENSE_API_URL || 'http://localhost:4001/api',
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('license_admin_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('license_admin_token');
            localStorage.removeItem('license_admin_user');
            // Full reload rather than a React state update — simplest way to guarantee
            // AuthContext re-reads a now-empty localStorage and falls back to the login screen.
            window.location.hash = '#admin';
            window.location.reload();
        }
        return Promise.reject(err);
    }
);

export default apiClient;
