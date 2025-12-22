'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/features/admin/api/admin.api';
import { useAdmin } from '@/features/admin/context/AdminContext';
import { formatDate, formatCurrency } from '@/features/admin/utils/format';

interface InsuranceForm {
    _id: string;
    invoiceNumber: string;
    user: {
        _id: string;
        mobileNumber: string;
        category?: string;
    } | null;
    itemName: string;
    quantity: number;
    amount: number;
    date: string;
    pdfURL?: string;
    weightmentSlipURL?: string;
    vehicleNumber: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

const handleViewPdf = async (url: string | undefined) => {
    if (!url) return;

    try {
        // Check if the URL is a full URL or a relative path
        const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

        // Open in a new tab
        const newWindow = window.open('', '_blank');

        // Try to open the PDF directly
        const pdfWindow = window.open(fullUrl, '_blank');

        // If the window was blocked by a popup blocker, show a message
        if (!pdfWindow || pdfWindow.closed || typeof pdfWindow.closed === 'undefined') {
            // Fallback to downloading the file
            const link = document.createElement('a');
            link.href = fullUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.download = url.split('/').pop() || 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (err) {
        console.error('Error opening PDF:', err);
        alert('Could not open the document. Please try again or contact support.');
    }
};

export default function InsuranceFormsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAdmin();

    const [forms, setForms] = useState<InsuranceForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalForms, setTotalForms] = useState(0);

    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/admin/login');
            return;
        }

        const fetchInsuranceForms = async () => {
            try {
                setLoading(true);
                setError('');

                const res = await adminApi.getInsuranceForms(
                    currentPage,
                    ITEMS_PER_PAGE
                );

                if (res?.success && Array.isArray(res.data)) {
                    setForms(res.data);
                    setTotalForms(res.count || 0);
                    setTotalPages(
                        Math.ceil((res.count || 1) / ITEMS_PER_PAGE)
                    );
                } else {
                    setError(res?.message || 'Failed to load insurance forms');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to load insurance forms');
            } finally {
                setLoading(false);
            }
        };

        fetchInsuranceForms();
    }, [currentPage, isAuthenticated, router]);

    if (loading && forms.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                    Insurance Forms
                </h1>

                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Invoice
                                </th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Mobile
                                </th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Category
                                </th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Item
                                </th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Qty
                                </th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Amount
                                </th>
                                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-900">
                                    Date
                                </th>
                                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900">
                                    Invoice
                                </th>
                                <th className="px-3 py-3 text-center text-sm font-semibold text-gray-900">
                                    Weight Slip
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {forms.map((form) => (
                                <tr key={form._id} className="hover:bg-gray-50">
                                    <td className="px-3 py-4 text-sm text-gray-900">
                                        {form.invoiceNumber}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {form.user?.mobileNumber ?? 'N/A'}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {form.user?.category ?? 'N/A'}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {form.itemName}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {form.quantity}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {formatCurrency(form.amount)}
                                    </td>
                                    <td className="px-3 py-4 text-sm text-gray-500">
                                        {formatDate(form.date || form.createdAt)}
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        {form.pdfURL ? (
                                            <button
                                                onClick={() => handleViewPdf(form.pdfURL)}
                                                className="text-green-600 hover:text-green-900"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        {form.weightmentSlipURL ? (
                                            <button
                                                onClick={() => handleViewPdf(form.weightmentSlipURL)}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </button>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {forms.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-6 py-4 text-center text-sm text-gray-500"
                                    >
                                        No insurance forms found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(currentPage * ITEMS_PER_PAGE, totalForms)}
                                    </span>{' '}
                                    of <span className="font-medium">{totalForms}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg
                                            className="h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Show pages around current page
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`${currentPage === pageNum
                                                    ? 'z-10 bg-green-50 border-green-500 text-green-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                    } relative inline-flex items-center px-4 py-2 border text-sm font-medium`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Next</span>
                                        <svg
                                            className="h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
