"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logout as logoutApi, setAuthToken } from "@/features/auth/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: any;
    loading: boolean;
    login: (token: string, userData?: any) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // --- 1. Initialize Auth State (Runs once on new tab load) ---
    useEffect(() => {
        const initAuth = async () => {
            console.log("🔄 [AuthContext] Initializing: Checking localStorage..."); // LOG 1

            try {
                // 1. Get data from LocalStorage
                const storedToken = localStorage.getItem('accessToken');
                const storedUser = localStorage.getItem('user');

                if (storedToken) {
                    console.log("✅ [AuthContext] Token found in storage."); // LOG 2

                    // 2. CRITICAL: Restore API Header immediately
                    setAuthToken(storedToken);

                    // 3. Restore User Data
                    if (storedUser) {
                        const parsedUser = JSON.parse(storedUser);
                        console.log("👤 [AuthContext] User data restored:", parsedUser); // LOG 3
                        setUser(parsedUser);
                    } else {
                        console.warn("⚠️ [AuthContext] Token exists but User data is missing."); // LOG 4
                    }
                } else {
                    console.log("❌ [AuthContext] No token found in storage."); // LOG 5
                }
            } catch (error) {
                console.error("🚨 [AuthContext] Error restoring session:", error);
                // If data is corrupted, clear it
                localStorage.removeItem('user');
                localStorage.removeItem('accessToken');
                setAuthToken(null);
            } finally {
                // Finish loading regardless of success/failure so app renders
                console.log("🏁 [AuthContext] Loading finished. Rendering app."); // LOG 6
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    // --- 2. Listen for Login/Logout in other tabs (Sync state) ---
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'accessToken') {
                console.log("🔄 [AuthContext] Storage event detected (Cross-tab sync)"); // LOG 7

                if (event.newValue) {
                    // Another tab logged in
                    console.log("📥 [AuthContext] syncing login from another tab");
                    setAuthToken(event.newValue);
                    const newUser = localStorage.getItem('user');
                    if (newUser) setUser(JSON.parse(newUser));
                } else {
                    // Another tab logged out
                    console.log("📤 [AuthContext] syncing logout from another tab");
                    setAuthToken(null);
                    setUser(null);
                    router.push("/");
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [router]);

    // --- Actions ---

    const login = (token: string, userData?: any) => {
        console.log("🔑 [AuthContext] Login action called"); // LOG 8

        // 1. Save to Storage
        localStorage.setItem('accessToken', token);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }

        // 2. Update State
        setUser(userData);

        // 3. Set API Header
        setAuthToken(token);

        // 4. Redirect
        console.log("🚀 [AuthContext] Redirecting to /home"); // LOG 9
        router.push("/home");
    };

    const logout = () => {
        console.log("👋 [AuthContext] Logout action called"); // LOG 10

        // 1. Clear local data first for speed
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');

        // 2. Update State
        setUser(null);
        setAuthToken(null);

        // 3. Redirect
        router.push("/");

        // 4. Notify server (optional, non-blocking)
        logoutApi().catch((err) => console.error("Logout API failed", err));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};