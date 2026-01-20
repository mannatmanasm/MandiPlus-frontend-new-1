'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/features/admin/context/AdminContext';
import { formatDate, formatCurrency } from '@/features/admin/utils/format';
import { adminApi, InvoiceFilterParams, RegenerateInvoicePayload } from '@/features/admin/api/admin.api';
import { toast } from 'react-toastify';
import 'cropperjs/dist/cropper.css';
import Cropper, { ReactCropperElement } from "react-cropper";
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

// --- Debounce Hook ---
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

interface Invoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    supplierName: string;
    supplierAddress: string[];
    billToName: string;
    billToAddress?: string[];
    shipToName?: string;
    shipToAddress?: string[];
    placeOfSupply?: string;
    productName: string[];
    hsnCode?: string;
    quantity: number;
    rate?: number;
    amount: number;
    vehicleNumber?: string;
    truckNumber?: string;
    weighmentSlipNote?: string;
    pdfUrl?: string;
    pdfURL?: string;
    createdAt: string;
    terms?: string;
    isVerified?: boolean;
}

export default function InsuranceFormsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAdmin();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [formData, setFormData] = useState<Partial<RegenerateInvoicePayload>>({});
    const [verifyingInvoiceId, setVerifyingInvoiceId] = useState<string | null>(null);

    // --- Cropper & File State ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isCropperReady, setIsCropperReady] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [weightmentSlip, setWeightmentSlip] = useState<File | null>(null);
    const cropperRef = useRef<ReactCropperElement>(null);

    const [filters, setFilters] = useState<InvoiceFilterParams>({
        invoiceType: '',
        startDate: '',
        endDate: '',
        supplierName: '',
        buyerName: ''
    });

    const debouncedFilters = useDebounce(filters, 500);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const activeFilters = Object.fromEntries(
                Object.entries(debouncedFilters).filter(([_, v]) => v !== '')
            );

            // Logic Updated: Use the full datetime string provided by datetime-local input
            if (activeFilters.startDate) {
                activeFilters.startDate = new Date(activeFilters.startDate as string).toISOString();
            }
            if (activeFilters.endDate) {
                // If user selected a specific time, use it. 
                // Note: If you still want to default to end-of-minute/hour when seconds aren't picked, 
                // standard ISO conversion is usually sufficient for datetime-local
                activeFilters.endDate = new Date(activeFilters.endDate as string).toISOString();
            }

            console.log("Fetching with filters:", activeFilters);
            const response = await adminApi.filterInvoices(activeFilters);

            let data: Invoice[] = [];
            if (Array.isArray(response.data)) {
                data = response.data;
            } else if (response.success && Array.isArray(response.data)) {
                data = response.data;
            } else if (Array.isArray(response)) {
                data = response as any;
            }

            const sortedData = data.sort((a: any, b: any) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setInvoices(sortedData);

        } catch (err: any) {
            console.error("Fetch error:", err);
            setError('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    }, [debouncedFilters]);

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/admin/login');
            return;
        }
        fetchInvoices();
    }, [isAuthenticated, router, fetchInvoices]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setCurrentPage(1);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const body = {
                invoiceType: filters.invoiceType || undefined,
                startDate: filters.startDate ? new Date(filters.startDate).toISOString() : undefined,
                endDate: filters.endDate ? new Date(filters.endDate).toISOString() : undefined,
            };

            const blob = await adminApi.exportInvoices(body);
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (err) {
            console.error("Export failed:", err);
            alert("Failed to export invoices");
        } finally {
            setExporting(false);
        }
    };

    const handleVerifyInvoice = async (invoiceId: string) => {
        // Safety: agar already verifying chal raha ho
        if (verifyingInvoiceId) return;

        const confirmed = window.confirm(
            "Are you sure you want to verify this invoice? Once verified, it cannot be changed."
        );

        if (!confirmed) return; // ❌ user cancelled

        try {
            setVerifyingInvoiceId(invoiceId);

            toast.loading("Verifying invoice...", { toastId: "verify-invoice" });

            const res = await adminApi.verifyInvoice(invoiceId);

            if (!res.success) {
                throw new Error(res.message || "Verification failed");
            }

            toast.update("verify-invoice", {
                render: "Invoice verified successfully",
                type: "success",
                isLoading: false,
                autoClose: 2000,
            });

            // Refresh list to get isVerified=true
            await fetchInvoices();
        } catch (error: any) {
            toast.update("verify-invoice", {
                render: error.message || "Failed to verify invoice",
                type: "error",
                isLoading: false,
                autoClose: 3000,
            });
        } finally {
            setVerifyingInvoiceId(null);
        }
    };




    const handleViewPdf = (url: string | undefined) => {
        if (!url) return;
        const fullUrl = url.startsWith('http')
            ? url
            : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${url}`;
        window.open(fullUrl, '_blank');
    };

    const handleEditClick = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setWeightmentSlip(null); // Reset file
        setFormData({
            invoiceId: invoice.id,
            invoiceType: 'BUYER_INVOICE',
            supplierName: invoice.supplierName,
            supplierAddress: Array.isArray(invoice.supplierAddress)
                ? invoice.supplierAddress.join('\n')
                : invoice.supplierAddress || '',
            placeOfSupply: invoice.placeOfSupply || '',
            billToName: invoice.billToName,
            billToAddress: (Array.isArray(invoice.billToAddress)
                ? invoice.billToAddress.join('\n')
                : invoice.billToAddress) || '',
            shipToName: invoice.shipToName || '',
            shipToAddress: Array.isArray(invoice.shipToAddress)
                ? invoice.shipToAddress.join('\n')
                : invoice.shipToAddress || '',
            productName: Array.isArray(invoice.productName)
                ? invoice.productName[0]
                : invoice.productName || '',
            hsnCode: invoice.hsnCode || '',
            quantity: invoice.quantity || 0,
            rate: invoice.rate || 0,
            amount: invoice.amount || 0,
            vehicleNumber: invoice.vehicleNumber || '',
            truckNumber: invoice.truckNumber || '',
            weighmentSlipNote: invoice.weighmentSlipNote || '',
            invoiceDate: invoice.invoiceDate.split('T')[0],
            terms: invoice.terms || ''
        });
        setIsEditing(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
                setIsCropping(true);
                setIsCropperReady(false);
                setRotation(0);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const rotateImage = (degrees: number) => {
        setRotation(prev => (prev + degrees) % 360);
        cropperRef.current?.cropper.rotateTo(rotation + degrees);
    };

    const handleCropComplete = () => {
        const cropper = cropperRef.current?.cropper;
        if (!cropper) return;
        cropper.getCroppedCanvas({
            minWidth: 300, minHeight: 300, maxWidth: 4096, maxHeight: 4096,
            fillColor: '#fff', imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
        }).toBlob(blob => {
            if (blob) {
                setWeightmentSlip(new File([blob], 'updated-weightment-slip.jpg', { type: 'image/jpeg' }));
                setIsCropping(false);
                setImageSrc(null);
            }
        }, 'image/jpeg', 0.9);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleRegenerate = async () => {
        if (!editingInvoice) return;

        setIsRegenerating(true);

        try {
            const payload: RegenerateInvoicePayload = {
                ...formData,
                invoiceId: editingInvoice.id,

                supplierAddress: formData.supplierAddress
                    ? typeof formData.supplierAddress === 'string'
                        ? formData.supplierAddress.split('\n').filter(Boolean)
                        : formData.supplierAddress
                    : [],

                billToAddress: formData.billToAddress
                    ? typeof formData.billToAddress === 'string'
                        ? formData.billToAddress.split('\n').filter(Boolean)
                        : formData.billToAddress
                    : [],

                shipToAddress: formData.shipToAddress
                    ? typeof formData.shipToAddress === 'string'
                        ? formData.shipToAddress.split('\n').filter(Boolean)
                        : formData.shipToAddress
                    : [],

                productName: formData.productName || '',
                quantity: Number(formData.quantity) || 0,
                rate: Number(formData.rate) || 0,
                amount: Number(formData.amount) || 0,
                vehicleNumber: formData.vehicleNumber || '',
                truckNumber: formData.truckNumber || '',
                weighmentSlipNote: formData.weighmentSlipNote || '',
                invoiceDate: formData.invoiceDate,
                terms: formData.terms || ''
            };

            const response = await adminApi.regenerateInvoice(payload);

            // 👇 If we reached here, API succeeded (status 200)
            const responseData = response?.data;

            toast.success('Invoice updated and PDF regeneration queued successfully');

            await fetchInvoices();

            setIsEditing(false);
            setEditingInvoice(null);

            const updatedInvoices = invoices.map(invoice =>
                invoice.id === payload.invoiceId
                    ? {
                        ...invoice,
                        pdfUrl:
                            responseData?.data?.pdfUrl ??
                            responseData?.pdfUrl ??
                            invoice.pdfUrl,
                        pdfURL:
                            responseData?.data?.pdfURL ??
                            responseData?.pdfURL ??
                            invoice.pdfURL,
                    }
                    : invoice
            );

            setInvoices(updatedInvoices);
        } catch (error: any) {
            console.error('Error regenerating invoice:', error);
            toast.error(error?.message || 'Failed to update invoice');
        } finally {
            setIsRegenerating(false);
        }
    };


    const closeModal = () => {
        setIsEditing(false);
        setEditingInvoice(null);
        setFormData({});
        setWeightmentSlip(null);
    };

    const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
    const paginatedInvoices = invoices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="py-6">
            {/* --- NEW: Cropper Overlay --- */}
            {isCropping && imageSrc && (
                <div className="fixed inset-0 z-60 bg-black flex flex-col">
                    <div className="flex-1 w-full relative min-h-0 bg-black">
                        <Cropper
                            src={imageSrc} style={{ height: '100%', width: '100%' }} ref={cropperRef}
                            guides={true} viewMode={1} dragMode="move" autoCropArea={1} checkOrientation={true}
                            ready={() => { setIsCropperReady(true); setRotation(0); }}
                        />
                    </div>
                    <div className="w-full bg-black/90 p-4 flex justify-between items-center px-6 z-50 border-t border-gray-800">
                        <div className="flex gap-4 text-white">
                            <button type="button" onClick={() => rotateImage(-90)}><ArrowPathIcon className="w-6 h-6 transform rotate-90" /></button>
                            <button type="button" onClick={() => rotateImage(90)}><ArrowPathIcon className="w-6 h-6 -scale-x-100 transform rotate-90" /></button>
                        </div>
                        <div className="flex gap-6">
                            <button type="button" onClick={() => { setIsCropping(false); setImageSrc(null); }} className="text-red-500"><XMarkIcon className="w-8 h-8" /></button>
                            <button type="button" onClick={handleCropComplete} disabled={!isCropperReady} className={isCropperReady ? 'text-[#25D366]' : 'text-gray-500'}><CheckIcon className="w-8 h-8" /></button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Invoices / Insurance Forms
                    </h1>
                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center disabled:opacity-50 transition-colors"
                    >
                        {exporting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Exporting...
                            </>
                        ) : 'Export to Excel'}
                    </button>
                </div>

                {/* Filter Section */}
                <div className="bg-white text-black p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <select
                        name="invoiceType"
                        value={filters.invoiceType}
                        onChange={handleFilterChange}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500"
                    >
                        <option value="">All Types</option>
                        <option value="SUPPLIER_INVOICE">Supplier Invoice</option>
                        <option value="BUYER_INVOICE">Buyer Invoice</option>
                    </select>

                    {/* Updated to datetime-local */}
                    <input
                        type="datetime-local"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="Start Date & Time"
                    />

                    {/* Updated to datetime-local */}
                    <input
                        type="datetime-local"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500"
                        placeholder="End Date & Time"
                    />

                    <input
                        type="text"
                        name="supplierName"
                        placeholder="Search Supplier..."
                        value={filters.supplierName}
                        onChange={handleFilterChange}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500"
                    />

                    <input
                        type="text"
                        name="buyerName"
                        placeholder="Search Buyer..."
                        value={filters.buyerName}
                        onChange={handleFilterChange}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500"
                    />
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-md">
                        <p>{error}</p>
                    </div>
                )}

                {/* Table Section */}
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                    {loading && invoices.length === 0 ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500">Verify</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                                            {loading ? 'Loading...' : 'No invoices found matching criteria.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-4 text-sm font-medium text-gray-900">{inv.invoiceNumber}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500">{formatDate(inv.invoiceDate)}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500">{inv.supplierName}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500">{inv.billToName}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500">{Array.isArray(inv.productName) ? inv.productName[0] : inv.productName}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500">{inv.vehicleNumber || '-'}</td>
                                            <td className="px-3 py-4 text-center">
                                                {(inv.pdfUrl || inv.pdfURL) ? (
                                                    <button
                                                        onClick={() => handleViewPdf(inv.pdfUrl || inv.pdfURL)}
                                                        className="text-green-600 hover:text-green-900 inline-flex items-center p-1 rounded hover:bg-green-50"
                                                        title="View PDF"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300 text-xs uppercase font-medium">Pending</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-4 text-center">
                                                {inv.isVerified ? (
                                                    <span
                                                        className="
        inline-flex items-center gap-1
        text-xs font-semibold
        text-green-700
        bg-green-100
        border border-green-200
        px-2 py-1
        rounded
        whitespace-nowrap
      "
                                                    >
                                                        <span className="text-green-600 text-sm leading-none">✓</span>
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleVerifyInvoice(inv.id)}
                                                        className="
        inline-flex items-center justify-center
        w-8 h-8
        text-green-600
        hover:text-green-800
        hover:bg-green-100
        rounded
        transition-colors
      "
                                                        title="Verify Invoice"
                                                    >
                                                        <span className="text-lg leading-none">✓</span>
                                                    </button>
                                                )}
                                            </td>


                                            <td className="px-3 py-4 text-center">
                                                <button
                                                    onClick={() => handleEditClick(inv)}
                                                    className="
      inline-flex items-center justify-center
      w-8 h-8
      text-blue-600
      hover:text-blue-800
      hover:bg-blue-100
      rounded
      transition-colors
    "
                                                    title="Edit Invoice"
                                                >
                                                    ✏️
                                                </button>
                                            </td>



                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-4 flex justify-between items-center">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Invoice Modal */}
            {
                isEditing && editingInvoice && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-3xl">
                                <h3 className="text-xl font-bold text-slate-800">Update Invoice</h3>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditingInvoice(null);
                                        setError('');
                                        setWeightmentSlip(null);
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* --- NEW: Image Upload Section --- */}
                                <div className="border border-gray-300 rounded-xl p-4">
                                    <label className="block text-sm font-medium text-slate-800 mb-2">Upload Weighment Slip</label>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                    <div className="flex flex-col gap-3">
                                        {weightmentSlip ? (
                                            <div className="text-green-700 text-sm bg-green-50 p-2 rounded">{weightmentSlip.name}</div>
                                        ) : (
                                            <div className="text-gray-500 text-sm text-center">No new slip selected</div>
                                        )}
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">
                                            📸 {weightmentSlip ? 'Replace Photo' : 'Upload New Photo'}
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                                    Invoice: <span className="font-semibold">{editingInvoice.invoiceNumber}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            Invoice Type
                                        </label>
                                        <select
                                            value={formData.invoiceType}
                                            onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as any })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        >
                                            <option value="BUYER_INVOICE">Buyer Invoice</option>
                                            <option value="SUPPLIER_INVOICE">Supplier Invoice</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Supplier Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.supplierName}
                                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter supplier name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Supplier Address
                                    </label>
                                    <textarea
                                        value={Array.isArray(formData.supplierAddress) ? formData.supplierAddress[0] : formData.supplierAddress}
                                        onChange={(e) => setFormData({ ...formData, supplierAddress: [e.target.value] })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter supplier address"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Bill To Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.billToName}
                                        onChange={(e) => setFormData({ ...formData, billToName: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter buyer name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Bill To Address
                                    </label>
                                    <textarea
                                        value={Array.isArray(formData.billToAddress) ? formData.billToAddress[0] : formData.billToAddress}
                                        onChange={(e) => setFormData({ ...formData, billToAddress: [e.target.value] })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter buyer address"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Ship To Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.shipToName}
                                        onChange={(e) => setFormData({ ...formData, shipToName: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter ship to name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Ship To Address
                                    </label>
                                    <textarea
                                        value={Array.isArray(formData.shipToAddress) ? formData.shipToAddress[0] : formData.shipToAddress}
                                        onChange={(e) => setFormData({ ...formData, shipToAddress: [e.target.value] })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter shipping address"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Place of Supply
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.placeOfSupply}
                                        onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter place of supply"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            Product Name
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.productName}
                                            onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                            placeholder="Enter product name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            HSN Code
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.hsnCode}
                                            onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                            placeholder="Enter HSN code"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            Quantity
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            Rate (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.rate}
                                            onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                            placeholder="0.00"
                                        />
                                    </div>

                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            Vehicle Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.vehicleNumber}
                                            onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                            placeholder="Enter vehicle number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-800 mb-1">
                                            Truck Number
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.truckNumber}
                                            onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                            placeholder="Enter truck number"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Weighment Slip Note
                                    </label>
                                    <textarea
                                        value={formData.weighmentSlipNote}
                                        onChange={(e) => setFormData({ ...formData, weighmentSlipNote: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter any additional notes"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Invoice Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.invoiceDate}
                                        onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">
                                        Terms
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.terms}
                                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 placeholder-gray-400 bg-white"
                                        placeholder="Enter terms"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditingInvoice(null);
                                        setError('');
                                        setWeightmentSlip(null);
                                    }}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                                    disabled={isRegenerating}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRegenerate}
                                    className="flex-1 px-4 py-3 bg-[#4309ac] text-white rounded-xl font-medium hover:bg-[#350889] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isRegenerating}
                                >
                                    {isRegenerating ? 'Updating...' : 'Update & Regenerate PDF'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}