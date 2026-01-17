"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, logout as logoutApi, setAuthToken } from "@/features/auth/api";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: any;
    loading: boolean;
    login: (token: string, userData?: any) => Promise<void>; // Updated to Promise
    logout: () => void;
    setUser: React.Dispatch<React.SetStateAction<any>>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // --- 1. Initialize Auth State ---
    useEffect(() => {
        const initAuth = async () => {
            console.log("🔄 [AuthContext] Initializing...");

            try {
                const storedToken = localStorage.getItem('accessToken');
                const storedUser = localStorage.getItem('user');

                if (storedToken) {
                    console.log("✅ [AuthContext] Token found.");
                    setAuthToken(storedToken);

                    if (storedUser) {
                        setUser(JSON.parse(storedUser));
                    } else {
                        // Optional: Fetch user if token exists but user data is missing
                        try {
                            const fetchedUser = await getCurrentUser();
                            setUser(fetchedUser);
                            localStorage.setItem('user', JSON.stringify(fetchedUser));
                        } catch (e) {
                            console.error("Failed to re-fetch user in background");
                        }
                    }
                }
            } catch (error) {
                console.error("🚨 [AuthContext] Error restoring session:", error);
                localStorage.clear();
                setAuthToken(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    // --- 2. Sync Tabs ---
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === 'accessToken') {
                if (event.newValue) {
                    setAuthToken(event.newValue);
                    const newUser = localStorage.getItem('user');
                    if (newUser) setUser(JSON.parse(newUser));
                } else {
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

    // UPDATED LOGIN FUNCTION
    const login = async (token: string, userData?: any) => {
        console.log("🔑 [AuthContext] Login action called");

        // 1. Set Token & Headers immediately
        localStorage.setItem('accessToken', token);
        setAuthToken(token);

        let finalUser = userData;

        // 2. If user data is missing in response, FETCH IT NOW
        if (!finalUser) {
            try {
                console.log("📥 [AuthContext] User data missing, fetching profile...");
                finalUser = await getCurrentUser();
            } catch (error) {
                console.error("🚨 [AuthContext] Failed to fetch user profile on login", error);
            }
        }

        // 3. Save User Data (if we have it now)
        if (finalUser) {
            localStorage.setItem('user', JSON.stringify(finalUser));
            setUser(finalUser);
            console.log("👤 [AuthContext] User successfully set:", finalUser);
        } else {
            console.warn("⚠️ [AuthContext] Login complete but User Data is still missing.");
        }

        // 4. Redirect
        console.log("🚀 [AuthContext] Redirecting to /home");
        router.push("/home");
    };

    const logout = () => {
        console.log("👋 [AuthContext] Logout action called");
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        setUser(null);
        setAuthToken(null);
        router.push("/");
        logoutApi().catch((err) => console.error("Logout API failed", err));
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, setUser}}>
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