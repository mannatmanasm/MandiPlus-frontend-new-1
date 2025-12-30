'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAdmin } from '@/features/admin/context/AdminContext';
import { formatDate, formatCurrency } from '@/features/admin/utils/format';

// --- 1. Define Interface Matching Your Backend DTO ---
interface Invoice {
    id: string; // Postgres uses 'id', Mongo uses '_id'. Adjust based on DB.
    invoiceNumber: string;
    invoiceDate: string;
    supplierName: string;
    supplierAddress: string[];
    billToName: string; // This was 'buyerName' conceptually
    productName: string[]; // Backend returns string[]
    quantity: number;
    amount: number;
    pdfUrl?: string;       // Matches backend field
    pdfURL?: string;       // Fallback
    weighmentSlipUrl?: string; // Matches backend field (if exists)
    createdAt: string;
}

// Helper to open PDFs
const handleViewPdf = (url: string | undefined) => {
    if (!url) return;
    // Handle relative vs absolute URLs
    const fullUrl = url.startsWith('http')
        ? url
        : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${url}`;
    window.open(fullUrl, '_blank');
};

export default function InsuranceFormsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAdmin();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/admin/login');
            return;
        }

        const fetchInvoices = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('adminToken'); // Assuming you store admin token here

                // --- 2. Call the Correct Backend Endpoint ---
                const response = await axios.get(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/invoices`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                // Handle nested data if your backend wraps it (e.g., response.data.data)
                // or direct array (response.data)
                const data = Array.isArray(response.data) ? response.data : response.data.data || [];

                // Sort by latest created
                const sortedData = data.sort((a: Invoice, b: Invoice) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                setInvoices(sortedData);
            } catch (err: any) {
                console.error('Fetch error:', err);
                setError(err.response?.data?.message || 'Failed to fetch invoices');
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [isAuthenticated, router]);

    // --- 3. Client-Side Pagination Logic ---
    const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
    const paginatedInvoices = invoices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                <p>Error: {error}</p>
            </div>
        );
    }

    return (
        <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                    Invoices / Insurance Forms
                </h1>

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                                {/* <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th> */}
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {paginatedInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-4 text-sm font-medium text-gray-900">
                                            {inv.invoiceNumber}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500">
                                            {formatDate(inv.invoiceDate)}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500">
                                            {inv.supplierName}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500">
                                            {inv.billToName}
                                        </td>
                                        {/* <td className="px-3 py-4 text-sm text-gray-500"> */}
                                            {/* Handle array product name */}
                                            {/* {inv.productName && inv.productName.length > 0 */}
                                                {/* ? inv.productName[0] */}
                                                {/* : 'N/A'} */}
                                        {/* </td> */}
                                        <td className="px-3 py-4 text-sm text-gray-500">
                                            {inv.quantity}
                                        </td>
                                        <td className="px-3 py-4 text-sm text-gray-500">
                                            {formatCurrency(inv.amount)}
                                        </td>
                                        <td className="px-3 py-4 text-center">
                                            {(inv.pdfUrl || inv.pdfURL) ? (
                                                <button
                                                    onClick={() => handleViewPdf(inv.pdfUrl || inv.pdfURL)}
                                                    className="text-green-600 hover:text-green-900 inline-flex items-center"
                                                    title="View PDF"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </button>
                                            ) : (
                                                <span className="text-gray-300">Pending</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-4 flex justify-between items-center">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border rounded-md disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border rounded-md disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}