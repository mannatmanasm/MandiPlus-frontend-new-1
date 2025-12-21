'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMyInsuranceForms } from '../api';

// Define the shape of the form data
interface InsuranceForm {
    _id: string;
    itemName: string;
    createdAt: string;
    supplierName: string;
    buyerName: string;
    quantity: number | string;
    rate: number | string;
    amount: number | string;
    vehicleNumber?: string;
    hsn?: string;
    placeOfSupply?: string;
    notes?: string;
    pdfURL?: string;
}

const MyInsuranceForms = () => {
    const [forms, setForms] = useState<InsuranceForm[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const router = useRouter();

    useEffect(() => {
        const fetchForms = async () => {
            console.log("Fetching forms..."); // Debug log

            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log("No token found, redirecting...");
                    router.push('/');
                    return;
                }

                // Call the API function
                const data = await getMyInsuranceForms();
                console.log("Forms fetched successfully:", data); // Debug log

                // Ensure data is an array before setting it
                if (Array.isArray(data)) {
                    setForms(data);
                } else {
                    console.error("Data received is not an array:", data);
                    setForms([]);
                }
            } catch (err: any) {
                console.error('Fetch forms error:', err);
                setError(err.message || 'Failed to load insurance forms.');
            } finally {
                // THIS MUST RUN TO STOP THE LOADING SPINNER
                console.log("Finished fetching, stopping loader.");
                setLoading(false);
            }
        };

        fetchForms();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#eae7f6] flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Loading forms...</p>
                {/* Temporary button to force stop loading if stuck */}
                <button onClick={() => setLoading(false)} className="text-xs text-blue-500 mt-4 underline">
                    Force Stop Loading
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#e0d7fc] p-5 flex flex-col items-center justify-center text-center">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-red-500 font-bold text-lg mb-2">Error Loading Data</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                        Try Again
                    </button>
                    <br />
                    <button
                        onClick={() => router.push('/home')}
                        className="text-gray-500 text-sm mt-4 underline"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#e0d7fc] pb-28">
            {/* Header */}
            <div className="bg-white text-black px-5 py-4 rounded-b-4xl mb-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.push('/home')}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100"
                    >
                        <span className="text-xl">←</span>
                    </button>
                    <h2 className="text-lg font-bold">My Forms</h2>
                    <div className="w-8"></div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                {forms.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow p-8 text-center mt-10">
                        <p className="text-gray-500 mb-4">No insurance forms found.</p>
                        <button
                            onClick={() => router.push('/insurance')}
                            className="bg-[#4309ac] text-white px-6 py-2 rounded-full"
                        >
                            Create New Form
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {forms.map((form) => (
                            <div key={form._id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800">{form.itemName}</h3>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {new Date(form.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p><strong>Buyer:</strong> {form.buyerName}</p>
                                    <p><strong>Amount:</strong> ₹{form.amount}</p>
                                    <p><strong>Vehicle:</strong> {form.vehicleNumber}</p>
                                </div>
                                {form.pdfURL && (
                                    <a
                                        href={`http://localhost:5000${form.pdfURL}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 block w-full text-center bg-[#4309ac] text-white py-2 rounded-lg text-sm font-medium"
                                    >
                                        Download PDF
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyInsuranceForms;