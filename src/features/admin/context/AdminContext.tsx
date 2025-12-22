'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../api/admin.api';

type AdminContextType = {
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            // Set the token in the API client
            adminApi.setAuthToken(token);
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const response = await adminApi.login(email, password);
            if (response.token) {
                localStorage.setItem('adminToken', response.token);
                adminApi.setAuthToken(response.token);
                setIsAuthenticated(true);
                router.push('/admin/dashboard');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('adminToken');
        adminApi.clearAuthToken();
        setIsAuthenticated(false);
        router.push('/admin/login');
    };

    return (
        <AdminContext.Provider value={{ isAuthenticated, loading, login, logout }}>
            {children}
        </AdminContext.Provider>
    );
}

export const useAdmin = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (context === undefined) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
