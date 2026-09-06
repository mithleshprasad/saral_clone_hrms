import { createContext, useContext, useState, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem('license_admin_user');
        return raw ? JSON.parse(raw) : null;
    });

    const login = useCallback(async (username, password) => {
        const { data } = await apiClient.post('/auth/login', { username, password });
        localStorage.setItem('license_admin_token', data.token);
        localStorage.setItem('license_admin_user', JSON.stringify(data.admin));
        setUser(data.admin);
        return data.admin;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('license_admin_token');
        localStorage.removeItem('license_admin_user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
