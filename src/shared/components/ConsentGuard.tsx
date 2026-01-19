"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import axios from "axios";
import { toast } from "react-toastify";

export default function ConsentGuard({ children }: { children: React.ReactNode }) {
    const { user, setUser } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check user consent status whenever user object changes
    useEffect(() => {
        // Only show if user exists AND isConsent is explicitly not true
        if (user && user.isConsent !== true) {
            setShowModal(true);
        } else {
            setShowModal(false);
        }
    }, [user]);

    const handleConsent = async () => {
        if (!user) return;
        setLoading(true);

        try {
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

            await axios.patch(`${apiUrl}/users/${user.id}/consent`, {
                consentText: "I agree to the Terms and Conditions and Privacy Policy",
            });

            // Update Local State immediately
            if (setUser) {
                setUser({ ...user, isConsent: true });
            }

            toast.success("Consent recorded successfully");
            setShowModal(false);

        } catch (error) {
            console.error("Consent Error:", error);
            toast.error("Failed to save consent. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // If no modal needed, just render the app content normally
    if (!showModal) {
        return <>{children}</>;
    }

    // If modal is needed, BLOCK the app content
    return (
        <>
            {/* The background app content (blurred/hidden) */}
            <div className="h-screen overflow-hidden blur-sm pointer-events-none select-none" aria-hidden="true">
                {children}
            </div>

            {/* The Blocking Modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-[90%] mx-auto border border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        Welcome to Mandi Plus
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        To continue securing your produce and managing risks, we need you to review and agree to our latest terms.
                    </p>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 text-sm text-gray-500">
                        By clicking "I Agree", you acknowledge that you have read and understood the
                        <span className="text-blue-600 font-medium ml-1">Terms and Conditions</span> and
                        <span className="text-blue-600 font-medium ml-1">Privacy Policy</span>.
                    </div>

                    <button
                        onClick={handleConsent}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            "I Agree & Continue"
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}