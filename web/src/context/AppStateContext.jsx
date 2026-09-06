import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

const AppStateContext = createContext(null);

function currentFinancialYear() {
    const today = new Date();
    const cy = today.getFullYear();
    const cm = today.getMonth() + 1;
    return cm >= 4 ? `${cy}-${cy + 1}` : `${cy - 1}-${cy}`;
}

export function AppStateProvider({ children }) {
    const { user } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [companyId, setCompanyId] = useState(() => localStorage.getItem('companyId') || '');
    const [financialYear, setFinancialYear] = useState(currentFinancialYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const refreshCompanies = useCallback(async () => {
        if (!user) return; // no session yet (e.g. still on /login) — avoid an unauthenticated 401
        const { data } = await apiClient.get('/companies');
        setCompanies(data);
        if (!companyId && data.length > 0) {
            setCompanyId(String(data[0].id));
        }
    }, [companyId, user]);

    // Re-fetches on login (user goes null -> object) as well as on initial mount when a
    // session is already present (page refresh) — this provider wraps /login too, so it
    // must not fire while logged out, and must catch up right after login succeeds.
    useEffect(() => { refreshCompanies(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (companyId) localStorage.setItem('companyId', companyId);
    }, [companyId]);

    const year = financialYear.split('-')[month >= 4 ? 0 : 1];

    return (
        <AppStateContext.Provider
            value={{ companies, companyId, setCompanyId, financialYear, setFinancialYear, month, setMonth, year, refreshCompanies }}
        >
            {children}
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const ctx = useContext(AppStateContext);
    if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
    return ctx;
}
