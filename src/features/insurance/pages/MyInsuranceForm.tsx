"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    getMyInsuranceForms,
    InsuranceForm, // Import the shared type instead of redefining it
    getBackendURL
} from '../api';

const MyInsuranceForms = () => {
    const router = useRouter();
    const [forms, setForms] = useState<InsuranceForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const data = await getMyInsuranceForms();
            setForms(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load forms');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (pdfUrl?: string) => {
        if (!pdfUrl) {
            alert('PDF not available');
            return;
        }
        // If it's a full Cloudinary URL, use it. Otherwise prepend backend URL.
        const link = pdfUrl.startsWith('http')
            ? pdfUrl
            : `${getBackendURL()}${pdfUrl}`;

        window.open(link, '_blank');
    };

    if (loading) return <div className="p-4 text-center">Loading...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

    return (
        <div className="min-h-screen bg-[#efeae2] p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-[#075E54]">My Invoices</h1>
                    <button
                        onClick={() => router.push('/insurance')}
                        className="bg-[#25D366] text-white px-4 py-2 rounded-lg hover:bg-[#20bd5a]"
                    >
                        + New Invoice
                    </button>
                </div>

                {forms.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        <p>No invoices found.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {forms.map((form) => (
                            <div key={form.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg">{form.invoiceNumber}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(form.invoiceDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                        ₹{form.amount}
                                    </span>
                                </div>

                                <div className="mt-3 text-sm text-gray-700 space-y-1">
                                    <p><strong>Bill To:</strong> {form.billToName}</p>
                                    <p><strong>Item:</strong> {form.productName && form.productName[0]}</p>
                                </div>

                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={() => handleDownload(form.pdfUrl || form.pdfURL)}
                                        className="text-[#075E54] font-medium hover:underline text-sm flex items-center gap-1"
                                    >
                                        📄 Download PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyInsuranceForms;