import axios from 'axios';

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

apiClient.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(err);
    }
);

// Downloads/opens a PDF (or other file) that requires the Authorization header — a plain
// <a href> or window.open can't attach that header, so we fetch as a blob and hand the
// browser an object URL instead.
//
// window.open() MUST be called synchronously inside the click handler, before any await —
// once a microtask/await boundary is crossed, it's no longer part of the original user
// gesture and browsers silently block it (you get a blank, dead tab, not an error). So we
// open the tab first, then navigate it once the blob is ready.
export async function openFile(url, { params } = {}) {
    const popup = window.open('', '_blank');
    try {
        const res = await apiClient.get(url, { params, responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(res.data);
        if (popup) {
            popup.location.href = blobUrl;
        } else {
            // Popup blocked even for the synchronous open (strict blocker settings) —
            // fall back to downloading in the current tab instead of failing silently.
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = url.split('/').pop() || 'download.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
    } catch (err) {
        popup?.close();
        throw err;
    }
}

export default apiClient;
