'use client';

import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/features/admin/context/AdminContext';
import { formatDate, formatCurrency } from '@/features/admin/utils/format';
import { adminApi, InvoiceFilterParams, RegenerateInvoicePayload } from '@/features/admin/api/admin.api';
import { toast } from 'react-toastify';
import 'cropperjs/dist/cropper.css';
import Cropper, { ReactCropperElement } from "react-cropper";
import { ArrowPathIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FileText, RefreshCw, Upload, Eye, CheckCircle, AlertCircle, Filter, X, XCircle, Pencil, ChevronDown, ChevronRight } from 'lucide-react';

import InsuranceUploadModal from '@/features/admin/components/InsuranceUploadModal';
import { uploadWeighmentSlips } from '@/features/insurance/api';

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

const INSURANCE_OVERRIDES_KEY = 'admin_invoice_insurance_overrides';
const getInvoiceKey = (inv: { id?: string; _id?: string; invoiceNumber?: string }) =>
    inv?.id || inv?._id || inv?.invoiceNumber || '';

interface Invoice {
    id: string;
    _id?: string;
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
    isRejected?: boolean;
    rejectionReason?: string | null;
    isSelected?: boolean;
    premiumAmount?: number;
    paymentStatus?: string;
    paymentAmount?: number | null;
    isPaymentRequired?: boolean;
    paymentLinkUrl?: string | null;
    insurance?: {
        fileUrl: string;
        fileType: string;
        uploadedAt: string;
    } | null;
}

export default function InsuranceFormsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAdmin();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [insuranceOverrides, setInsuranceOverrides] = useState<
        Record<string, { fileUrl: string; uploadedAt: string; fileType?: string }>
    >(() => {
        if (typeof window === 'undefined') return {};
        try {
            const stored = window.localStorage.getItem(INSURANCE_OVERRIDES_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') return parsed;
            }
        } catch (e) {
            console.error('Failed to load insurance overrides from storage', e);
        }
        return {};
    });
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);
    const [selectedInvoiceForInsurance, setSelectedInvoiceForInsurance] = useState<Invoice | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [formData, setFormData] = useState<Partial<RegenerateInvoicePayload>>({});
    const [verifyingInvoiceId, setVerifyingInvoiceId] = useState<string | null>(null);
    const [rejectingInvoiceId, setRejectingInvoiceId] = useState<string | null>(null);
    const [sendingPaymentInvoiceId, setSendingPaymentInvoiceId] = useState<string | null>(null);
    const [exportType, setExportType] = useState<'all' | 'payment'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

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

            if (activeFilters.startDate) {
                const parsed = new Date(activeFilters.startDate as string);
                if (!Number.isNaN(parsed.getTime())) {
                    activeFilters.startDate = parsed.toISOString();
                } else {
                    delete (activeFilters as any).startDate;
                }
            }
            if (activeFilters.endDate) {
                const parsed = new Date(activeFilters.endDate as string);
                if (!Number.isNaN(parsed.getTime())) {
                    activeFilters.endDate = parsed.toISOString();
                } else {
                    delete (activeFilters as any).endDate;
                }
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

            const merged = sortedData.map((inv: any) => {
                const key = getInvoiceKey(inv);
                const override = key ? insuranceOverrides[key] : undefined;
                if (!override) return inv;
                return {
                    ...inv,
                    insurance: {
                        fileUrl: override.fileUrl,
                        uploadedAt: override.uploadedAt,
                        fileType: override.fileType ?? 'application/pdf',
                    },
                };
            });

            setInvoices(merged);

        } catch (err: any) {
            console.error("Fetch error:", err);
            setError('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    }, [debouncedFilters, insuranceOverrides]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(
                INSURANCE_OVERRIDES_KEY,
                JSON.stringify(insuranceOverrides),
            );
        } catch (e) {
            console.error('Failed to save insurance overrides to storage', e);
        }
    }, [insuranceOverrides]);

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
            const body: any = {
                exportType: exportType,
            };

            if (filters.startDate && filters.endDate) {
                body.startDate = new Date(filters.startDate).toISOString();
                body.endDate = new Date(filters.endDate).toISOString();
            } else {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);

                body.startDate = startDate.toISOString();
                body.endDate = endDate.toISOString();
            }

            if (filters.invoiceType && exportType === 'all') {
                body.invoiceType = filters.invoiceType;
            }

            console.log("📤 Export payload:", body);

            const blob = await adminApi.exportInvoices(body);

            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                const timestamp = new Date().toISOString().split('T')[0];
                const fileName =
                    exportType === 'payment'
                        ? `payment_export_${timestamp}.xlsx`
                        : `invoices_export_${timestamp}.xlsx`;

                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success('✅ Export successful!');
            }
        } catch (err: any) {
            console.error("❌ Export failed:", err);
            const errorMsg = err?.response?.data?.message || err?.message || "Failed to export";
            toast.error(errorMsg);
        } finally {
            setExporting(false);
        }
    };

    const handleVerifyInvoice = async (invoiceId: string) => {
        if (verifyingInvoiceId) return;

        const confirmed = window.confirm(
            "Verify invoice and send payment link via WhatsApp? This action cannot be undone."
        );

        if (!confirmed) return;

        try {
            setVerifyingInvoiceId(invoiceId);

            toast.loading("Verifying & sending payment link...", { toastId: "verify-invoice" });

            const res = await adminApi.verifyAndSendPaymentForInvoice(invoiceId);

            if (!res.success) {
                throw new Error(res.message || "Verification failed");
            }

            toast.update("verify-invoice", {
                render: "Invoice verified and payment link sent",
                type: "success",
                isLoading: false,
                autoClose: 2000,
            });

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

    const handleRejectInvoice = async (inv: Invoice) => {
        if (rejectingInvoiceId) return;
        if (inv.isRejected) return;

        const rejectionReason = window.prompt('Reject this invoice? Optional: enter a reason (admin only).', '');
        const confirmed = window.confirm('Are you sure you want to reject this invoice?');
        if (!confirmed) return;

        try {
            setRejectingInvoiceId(inv.id);
            toast.loading('Rejecting invoice...', { toastId: 'reject-invoice' });

            const res = await adminApi.rejectInvoice(inv.id, rejectionReason || undefined);
            if (!res.success) {
                throw new Error(res.message || 'Failed to reject invoice');
            }

            toast.update('reject-invoice', {
                render: 'Invoice rejected',
                type: 'success',
                isLoading: false,
                autoClose: 2000,
            });

            await fetchInvoices();
        } catch (error: any) {
            toast.update('reject-invoice', {
                render: error?.message || 'Failed to reject invoice',
                type: 'error',
                isLoading: false,
                autoClose: 3000,
            });
        } finally {
            setRejectingInvoiceId(null);
        }
    };

    const toFullFileUrl = (url?: string) => {
        if (!url) return '';
        return url.startsWith('http')
            ? url
            : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}${url}`;
    };

    const getInsuranceFileUrl = (inv: any): string | undefined => {
        const insurance = inv?.insurance;
        if (typeof insurance === 'string') return insurance;
        if (insurance?.fileUrl) return insurance.fileUrl;
        if (insurance?.url) return insurance.url;
        if (inv?.insuranceFileUrl) return inv.insuranceFileUrl;
        if (inv?.insuranceUrl) return inv.insuranceUrl;
        const key = getInvoiceKey(inv);
        if (key && insuranceOverrides[key]) return insuranceOverrides[key].fileUrl;
        return undefined;
    };

    const handleViewPdf = (url: string | undefined) => {
        if (!url) return;
        window.open(toFullFileUrl(url), '_blank');
    };

    const handleEditClick = (invoice: Invoice) => {
        setEditingInvoice(invoice);
        setWeightmentSlip(null);
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
        setFormData(prev => {
            const next: Partial<RegenerateInvoicePayload> = {
                ...prev,
                [name]: value,
            };

            if (name === 'quantity' || name === 'rate') {
                const qty = Number(name === 'quantity' ? value : next.quantity) || 0;
                const rate = Number(name === 'rate' ? value : next.rate) || 0;
                next.amount = qty * rate;
            }

            return next;
        });
    };

    const handleRegenerate = async () => {
        if (!editingInvoice) return;

        setIsRegenerating(true);

        try {
            if (weightmentSlip) {
                await uploadWeighmentSlips(editingInvoice.id, [weightmentSlip]);
            }

            const qty = Number(formData.quantity) || 0;
            const rate = Number(formData.rate) || 0;
            const computedAmount = qty * rate;

            const payload: RegenerateInvoicePayload = {
                ...formData,
                invoiceId: editingInvoice.id,

                supplierAddress: typeof formData.supplierAddress === "string"
                    ? formData.supplierAddress.split("\n").filter(Boolean)
                    : formData.supplierAddress || [],

                billToAddress: typeof formData.billToAddress === "string"
                    ? formData.billToAddress.split("\n").filter(Boolean)
                    : formData.billToAddress || [],

                shipToAddress: typeof formData.shipToAddress === "string"
                    ? formData.shipToAddress.split("\n").filter(Boolean)
                    : formData.shipToAddress || [],

                quantity: qty,
                rate,
                amount: computedAmount,
            };

            await adminApi.regenerateInvoice(payload);
            toast.success("Invoice updated & PDF regenerated");
            await fetchInvoices();
            closeModal();
        } catch (error: any) {
            console.error("Regenerate error:", error);
            toast.error(error?.message || "Failed to regenerate invoice");
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

    const getInsuredPersonName = (inv: Invoice) => {
        const note = (inv.weighmentSlipNote || '').toLowerCase().trim();
        const isCash = note.includes('cash') || note.includes('nak') || note.includes('nag');
        return isCash ? (inv.billToName || '') : (inv.supplierName || '');
    };

    const getOtherPartyName = (inv: Invoice) => {
        const note = (inv.weighmentSlipNote || '').toLowerCase().trim();
        const isCash = note.includes('cash') || note.includes('nak') || note.includes('nag');
        return isCash ? (inv.supplierName || '') : (inv.billToName || '');
    };

    const getPaymentStatusLabelAndClasses = (inv: Invoice) => {
        const raw = inv.paymentStatus || '';
        const s = raw.toUpperCase();

        if (s === 'PAID') {
            return { label: 'PAID', classes: 'border-emerald-200 bg-emerald-50 text-emerald-700' };
        }
        if (s === 'FAILED') {
            return { label: 'FAILED', classes: 'border-rose-200 bg-rose-50 text-rose-700' };
        }
        if (s === 'REFUNDED') {
            return { label: 'REFUNDED', classes: 'border-slate-200 bg-slate-50 text-slate-700' };
        }
        if (s === 'PENDING') {
            return { label: 'PENDING', classes: 'border-amber-200 bg-amber-50 text-amber-700' };
        }
        if (s === 'NOT_REQUIRED' || inv.isPaymentRequired === false) {
            return { label: 'NOT_REQUIRED', classes: 'border-slate-200 bg-slate-50 text-slate-700' };
        }

        return { label: raw || 'PENDING', classes: 'border-amber-200 bg-amber-50 text-amber-700' };
    };

    const handleSendPaymentLink = async (inv: Invoice) => {
        if (sendingPaymentInvoiceId) return;

        if (inv.isRejected) {
            toast.error('Rejected invoice cannot send payment link');
            return;
        }

        const confirmed = window.confirm(
            'Verify invoice and send payment link via WhatsApp? This action cannot be undone.',
        );
        if (!confirmed) return;

        try {
            setSendingPaymentInvoiceId(inv.id);
            toast.loading('Generating payment link...', { toastId: 'payment-link' });

            const res = await adminApi.verifyAndSendPaymentForInvoice(inv.id);
            if (!res.success) {
                throw new Error(res.message || 'Failed to send payment link');
            }

            toast.update('payment-link', {
                render: 'Payment link sent successfully',
                type: 'success',
                isLoading: false,
                autoClose: 2000,
            });

            await fetchInvoices();
        } catch (error: any) {
            toast.update('payment-link', {
                render: error?.message || 'Failed to send payment link',
                type: 'error',
                isLoading: false,
                autoClose: 3000,
            });
        } finally {
            setSendingPaymentInvoiceId(null);
        }
    };

    const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
    const paginatedInvoices = invoices.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="min-h-screen bg-gray-50 py-4 sm:py-6">
            {/* Cropper Overlay */}
            {isCropping && imageSrc && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="flex-1 w-full relative min-h-0 bg-black">
                        <Cropper
                            src={imageSrc}
                            style={{ height: '100%', width: '100%' }}
                            ref={cropperRef}
                            guides={true}
                            viewMode={1}
                            dragMode="move"
                            autoCropArea={1}
                            checkOrientation={true}
                            ready={() => {
                                setIsCropperReady(true);
                                setRotation(0);
                            }}
                        />
                    </div>
                    <div className="w-full bg-black/90 p-3 sm:p-4 flex justify-between items-center px-4 sm:px-6 z-50 border-t border-gray-800">
                        <div className="flex gap-3 sm:gap-4 text-white">
                            <button type="button" onClick={() => rotateImage(-90)}>
                                <ArrowPathIcon className="w-5 h-5 sm:w-6 sm:h-6 transform rotate-90" />
                            </button>
                            <button type="button" onClick={() => rotateImage(90)}>
                                <ArrowPathIcon className="w-5 h-5 sm:w-6 sm:h-6 -scale-x-100 transform rotate-90" />
                            </button>
                        </div>
                        <div className="flex gap-4 sm:gap-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCropping(false);
                                    setImageSrc(null);
                                }}
                                className="text-red-500"
                            >
                                <XMarkIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                            </button>
                            <button
                                type="button"
                                onClick={handleCropComplete}
                                disabled={!isCropperReady}
                                className={isCropperReady ? 'text-[#25D366]' : 'text-gray-500'}
                            >
                                <CheckIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-none px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-10">
                {/* Header - Responsive */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
                        Invoices / Insurance Forms
                    </h1>

                    <button
                        onClick={handleExport}
                        disabled={exporting || loading}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                    >
                        {exporting ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" />
                                <span className="hidden sm:inline">Export to Excel</span>
                                <span className="sm:hidden">Export</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Mobile Filter Toggle */}
                <div className="sm:hidden mb-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg shadow-sm border border-gray-200"
                    >
                        <Filter className="w-4 h-4" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                </div>

                <div className={`bg-white text-black p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6 ${showFilters ? 'block' : 'hidden sm:block'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                        <select
                            name="invoiceType"
                            value={
                                exportType === 'payment'
                                    ? 'PAYMENT_EXPORT'
                                    : (filters.invoiceType || '')
                            }
                            onChange={(e) => {
                                const value = e.target.value;

                                if (value === 'PAYMENT_EXPORT') {
                                    setExportType('payment');
                                    setFilters(prev => ({ ...prev, invoiceType: '' }));
                                } else {
                                    setExportType('all');
                                    setFilters(prev => ({ ...prev, invoiceType: value }));
                                }
                            }}
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500 w-full"
                        >
                            <option value="">All Invoices</option>
                            <option value="SUPPLIER_INVOICE">Supplier Invoice</option>
                            <option value="BUYER_INVOICE">Buyer Invoice</option>
                            <option value="PAYMENT_EXPORT">Payment Export</option>
                        </select>

                        <input
                            type="datetime-local"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500 w-full"
                            placeholder="Start Date & Time"
                        />

                        <input
                            type="datetime-local"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500 w-full"
                            placeholder="End Date & Time"
                        />

                        <input
                            type="text"
                            name="supplierName"
                            placeholder="Search Supplier..."
                            value={filters.supplierName}
                            onChange={handleFilterChange}
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500 w-full"
                        />

                        <input
                            type="text"
                            name="buyerName"
                            placeholder="Search Buyer..."
                            value={filters.buyerName}
                            onChange={handleFilterChange}
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-green-500 focus:border-green-500 w-full"
                        />
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-4 p-3 sm:p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-md text-sm">
                        <p>{error}</p>
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                    {loading && invoices.length === 0 ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto overflow-y-hidden">
                            <table className="w-full min-w-[1700px] table-auto divide-y divide-gray-200 border-separate border-spacing-0">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="sticky left-0 z-[999] w-10 bg-slate-50 bg-clip-padding px-2 py-3 xl:px-2 xl:py-2 relative overflow-hidden"></th>
                                        <th className="sticky left-10 z-[999] w-40 bg-slate-50 bg-clip-padding px-3 py-3 xl:px-2 xl:py-2 text-left text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider relative overflow-hidden">
                                            Invoice #
                                        </th>
                                        <th className="sticky left-[200px] z-[999] w-32 bg-slate-50 bg-clip-padding px-3 py-3 xl:px-2 xl:py-2 text-left text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider relative overflow-hidden">
                                            Date
                                        </th>
                                        <th className="sticky left-[328px] z-[999] w-44 bg-slate-50 bg-clip-padding px-3 py-3 xl:px-2 xl:py-2 text-left text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider relative overflow-hidden shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200">
                                            Insured Person
                                        </th>
                                        <th className="w-44 bg-slate-50 px-3 py-3 xl:px-2 xl:py-2 text-left text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider pl-6">
                                            Other Party
                                        </th>

                                        <th className="w-40 bg-slate-50 px-3 py-3 xl:px-2 xl:py-2 text-left text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider pl-4">Product</th>
                                        <th className="w-32 bg-slate-50 px-3 py-3 xl:px-2 xl:py-2 text-left text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider pl-4">Vehicle</th>
                                        <th className="bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">PDF</th>
                                        <th className="bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Verify</th>
                                        <th className="bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Edit</th>
                                        <th className="bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Insurance</th>
                                        <th className="w-36 bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Premium Amount</th>
                                        <th className="w-32 bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Payment Status</th>
                                        <th className="w-44 bg-slate-50 px-2 py-3 xl:py-2 text-center text-xs xl:text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Send Payment Link</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {paginatedInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={14} className="px-6 py-12 text-center text-sm text-gray-500">
                                                {loading ? 'Loading...' : 'No invoices found matching criteria.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedInvoices.map((inv) => (
                                            <Fragment key={inv.id}>
                                                <tr className={`transition-colors ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                                    <td className={`sticky left-0 z-[900] w-10 bg-white bg-clip-padding px-2 py-3 xl:px-2 xl:py-2 text-center align-top relative overflow-hidden ${expandedInvoiceId === inv.id ? 'bg-slate-50' : ''}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExpandedInvoiceId((prev) => (prev === inv.id ? null : inv.id))
                                                            }
                                                            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${expandedInvoiceId === inv.id
                                                                ? 'border-[#4309ac]/25 bg-[#4309ac]/10 text-[#4309ac]'
                                                                : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                            title={expandedInvoiceId === inv.id ? 'Collapse' : 'Expand'}
                                                        >
                                                            {expandedInvoiceId === inv.id ? (
                                                                <ChevronDown className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className={`sticky left-10 z-[900] w-40 bg-white bg-clip-padding px-3 py-3 xl:px-2 xl:py-2 text-sm xl:text-[13px] font-semibold text-slate-900 align-top relative overflow-hidden ${expandedInvoiceId === inv.id ? 'bg-slate-50' : ''}`}>
                                                        <div className="break-words leading-snug">{inv.invoiceNumber}</div>
                                                    </td>
                                                    <td className={`sticky left-[200px] z-[900] w-32 bg-white bg-clip-padding px-3 py-3 xl:px-2 xl:py-2 text-sm xl:text-[13px] text-slate-600 align-top relative overflow-hidden ${expandedInvoiceId === inv.id ? 'bg-slate-50' : ''}`}>
                                                        <div className="break-words leading-snug">{formatDate(inv.createdAt)}</div>
                                                    </td>
                                                    <td className={`sticky left-[328px] z-[900] w-44 bg-white bg-clip-padding px-3 py-3 xl:px-2 xl:py-2 text-sm xl:text-[13px] text-slate-700 align-top relative overflow-hidden shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-slate-200 ${expandedInvoiceId === inv.id ? 'bg-slate-50' : ''}`}>
                                                        <div className="break-words leading-snug">{getInsuredPersonName(inv)}</div>
                                                    </td>
                                                    <td className={`w-44 px-3 py-3 xl:px-2 xl:py-2 text-sm xl:text-[13px] text-slate-700 align-top pl-6 ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <div className="break-words leading-snug">{getOtherPartyName(inv)}</div>
                                                    </td>

                                                    <td className={`w-40 px-3 py-3 xl:px-2 xl:py-2 text-sm xl:text-[13px] text-slate-700 align-top pl-4 ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <div className="break-words leading-snug">{Array.isArray(inv.productName) ? inv.productName[0] : inv.productName}</div>
                                                    </td>
                                                    <td className={`w-32 px-3 py-3 xl:px-2 xl:py-2 text-sm xl:text-[13px] text-slate-700 align-top pl-4 ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <div className="break-words leading-snug">{inv.vehicleNumber || '-'}</div>
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 text-center align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        {(inv.pdfUrl || inv.pdfURL) ? (
                                                            <button
                                                                onClick={() => handleViewPdf(inv.pdfUrl || inv.pdfURL)}
                                                                className="inline-flex items-center justify-center w-9 h-9 text-[#4309ac] hover:bg-[#4309ac]/10 rounded-lg border border-[#4309ac]/20"
                                                                title="View Invoice PDF"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-gray-300 text-xs">Pending</span>
                                                        )}
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 text-center align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        {inv.isRejected ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-2 py-1 rounded">
                                                                <XCircle className="w-3 h-3" />
                                                                Rejected
                                                            </span>
                                                        ) : inv.isVerified ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded">
                                                                ✓ Verified
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleVerifyInvoice(inv.id)}
                                                                    className="inline-flex items-center justify-center w-9 h-9 text-emerald-700 hover:bg-emerald-50 rounded-lg border border-emerald-200"
                                                                    title="Verify Invoice"
                                                                >
                                                                    <CheckIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectInvoice(inv)}
                                                                    className="inline-flex items-center justify-center w-9 h-9 text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200"
                                                                    title="Reject Invoice"
                                                                    disabled={rejectingInvoiceId === inv.id}
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 text-center align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <button
                                                            onClick={() => handleEditClick(inv)}
                                                            className="inline-flex items-center justify-center w-9 h-9 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                                                            title="Edit Invoice"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <div className="flex flex-col items-center gap-2">
                                                            {getInsuranceFileUrl(inv) ? (
                                                                <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                                                    <CheckCircle className="w-3 h-3" />
                                                                    <span>Uploaded</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-full">
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    <span>Pending</span>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2">
                                                                {getInsuranceFileUrl(inv) && (
                                                                    <button
                                                                        onClick={() => window.open(toFullFileUrl(getInsuranceFileUrl(inv)), '_blank')}
                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200"
                                                                        title="View Insurance"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedInvoiceForInsurance(inv);
                                                                        setShowInsuranceModal(true);
                                                                    }}
                                                                    className={`p-2 rounded-lg transition-colors group relative border ${getInsuranceFileUrl(inv)
                                                                        ? 'text-orange-600 hover:bg-orange-50 border-orange-200'
                                                                        : 'text-blue-600 hover:bg-blue-50 border-blue-200'
                                                                        }`}
                                                                    title={getInsuranceFileUrl(inv) ? 'Replace Insurance' : 'Upload Insurance'}
                                                                >
                                                                    {getInsuranceFileUrl(inv) ? (
                                                                        <RefreshCw className="w-4 h-4" />
                                                                    ) : (
                                                                        <Upload className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            </div>

                                                            {inv.insurance?.uploadedAt && (
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(inv.insurance.uploadedAt).toLocaleDateString('en-IN', {
                                                                        day: '2-digit',
                                                                        month: 'short'
                                                                    })}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 text-center align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <span className="text-sm xl:text-[13px] font-semibold text-slate-900">
                                                            {typeof inv.premiumAmount === 'number'
                                                                ? formatCurrency(inv.premiumAmount)
                                                                : formatCurrency((Number(inv.amount) || 0) * 0.002)}
                                                        </span>
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 text-center align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        {(() => {
                                                            const s = getPaymentStatusLabelAndClasses(inv);
                                                            return (
                                                                <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${s.classes}`}>
                                                                    {s.label}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className={`px-2 py-3 xl:py-2 text-center align-top ${expandedInvoiceId === inv.id ? 'bg-slate-50' : 'bg-white'}`}>
                                                        <button
                                                            onClick={() => handleSendPaymentLink(inv)}
                                                            disabled={sendingPaymentInvoiceId === inv.id || !!inv.isRejected}
                                                            className="inline-flex items-center justify-center rounded-lg bg-[#4309ac] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4309ac]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Generate payment link"
                                                        >
                                                            {sendingPaymentInvoiceId === inv.id ? 'Sending...' : 'Send WhatsApp Link'}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {expandedInvoiceId === inv.id && (
                                                    <tr className="bg-slate-50/60">
                                                        <td colSpan={14} className="px-4 pb-4">
                                                            <div className="sticky left-0 z-10 mt-3 w-full max-w-[min(100%,calc(100vw-18rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                                                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-slate-900">Details</p>
                                                                        <p className="mt-0.5 text-xs text-slate-500 truncate">
                                                                            {inv.invoiceNumber}
                                                                        </p>
                                                                    </div>

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${inv.isVerified
                                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                            : 'border-slate-200 bg-white text-slate-700'
                                                                            }`}>
                                                                            {inv.isVerified ? (
                                                                                <CheckIcon className="h-3.5 w-3.5" />
                                                                            ) : (
                                                                                <AlertCircle className="h-3.5 w-3.5" />
                                                                            )}
                                                                            {inv.isVerified ? 'Verified' : 'Not Verified'}
                                                                        </span>
                                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${getInsuranceFileUrl(inv)
                                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                            : 'border-amber-200 bg-amber-50 text-amber-700'
                                                                            }`}>
                                                                            {getInsuranceFileUrl(inv) ? (
                                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                            ) : (
                                                                                <AlertCircle className="h-3.5 w-3.5" />
                                                                            )}
                                                                            {getInsuranceFileUrl(inv) ? 'Insurance Uploaded' : 'Insurance Pending'}
                                                                        </span>
                                                                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${(inv.pdfUrl || inv.pdfURL)
                                                                            ? 'border-[#4309ac]/20 bg-[#4309ac]/10 text-[#4309ac]'
                                                                            : 'border-slate-200 bg-slate-50 text-slate-700'
                                                                            }`}>
                                                                            <FileText className="h-3.5 w-3.5" />
                                                                            {(inv.pdfUrl || inv.pdfURL) ? 'PDF Ready' : 'PDF Pending'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="p-4">
                                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
                                                                    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 lg:flex-[0.7_1_0%] lg:self-stretch flex-1">
                                                                        <p className="text-sm font-semibold text-slate-900">Applicant Details</p>
                                                                        <dl className="mt-3 space-y-2">
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <dt className="text-xs font-semibold text-slate-500">Place of Supply</dt>
                                                                                <dd className="text-sm text-slate-900 text-right break-words">{inv.placeOfSupply || '-'}</dd>
                                                                            </div>

                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Supplier Address</dt>
                                                                                    <dd className="text-sm text-slate-900 text-right break-words">
                                                                                        {Array.isArray(inv.supplierAddress) && inv.supplierAddress.length > 0
                                                                                            ? inv.supplierAddress.join(', ')
                                                                                            : '-'}
                                                                                    </dd>
                                                                                </div>
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Bill To Address</dt>
                                                                                    <dd className="text-sm text-slate-900 text-right break-words">
                                                                                        {Array.isArray(inv.billToAddress) && inv.billToAddress.length > 0
                                                                                            ? inv.billToAddress.join(', ')
                                                                                            : '-'}
                                                                                    </dd>
                                                                                </div>
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Ship To Name</dt>
                                                                                    <dd className="text-sm text-slate-900 text-right break-words">{inv.shipToName || '-'}</dd>
                                                                                </div>
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Ship To Address</dt>
                                                                                    <dd className="text-sm text-slate-900 text-right break-words">
                                                                                        {Array.isArray(inv.shipToAddress) && inv.shipToAddress.length > 0
                                                                                            ? inv.shipToAddress.join(', ')
                                                                                            : '-'}
                                                                                    </dd>
                                                                                </div>
                                                                            </dl>
                                                                    </div>

                                                                    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 lg:flex-[1_1_0%] lg:self-stretch flex-1">
                                                                        <p className="text-sm font-semibold text-slate-900">Invoice Details</p>
                                                                        <dl className="mt-3 space-y-2">
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <dt className="text-xs font-semibold text-slate-500">HSN</dt>
                                                                                <dd className="text-sm text-slate-900 text-right break-words">{inv.hsnCode || '-'}</dd>
                                                                            </div>

                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Quantity</dt>
                                                                                    <dd className="text-sm text-slate-900 text-right break-words">{inv.quantity ?? '-'}</dd>
                                                                                </div>
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Rate</dt>
                                                                                    <dd className="text-sm text-slate-900 text-right break-words">
                                                                                        {typeof inv.rate === 'number' ? formatCurrency(inv.rate) : '-'}
                                                                                    </dd>
                                                                                </div>
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <dt className="text-xs font-semibold text-slate-500">Amount</dt>
                                                                                    <dd className="text-sm font-semibold text-slate-900 text-right break-words">{formatCurrency(inv.amount)}</dd>
                                                                                </div>
                                                                        </dl>
                                                                    </div>

                                                                    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-2 lg:flex-[0.8_1_0%] lg:self-stretch flex-1">
                                                                        <p className="text-sm font-semibold text-slate-900">Documents</p>
                                                                        <div className="mt-3 space-y-3">
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <p className="text-xs font-semibold text-slate-500">Invoice PDF</p>
                                                                                {(inv.pdfUrl || inv.pdfURL) ? (
                                                                                    <button
                                                                                        onClick={() => handleViewPdf(inv.pdfUrl || inv.pdfURL)}
                                                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#4309ac]/20 px-3 py-2 text-sm font-semibold text-[#4309ac] hover:bg-[#4309ac]/10"
                                                                                    >
                                                                                        <FileText className="w-4 h-4" />
                                                                                        View
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-sm text-slate-600">Pending</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <p className="text-xs font-semibold text-slate-500">Insurance</p>
                                                                                {getInsuranceFileUrl(inv) ? (
                                                                                    <button
                                                                                        onClick={() => window.open(toFullFileUrl(getInsuranceFileUrl(inv)), '_blank')}
                                                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#4309ac]/20 px-3 py-2 text-sm font-semibold text-[#4309ac] hover:bg-[#4309ac]/10"
                                                                                    >
                                                                                        <Eye className="w-4 h-4" />
                                                                                        View
                                                                                    </button>
                                                                                ) : (
                                                                                    <span className="text-sm text-slate-600">Pending</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-start justify-between gap-3">
                                                                                <p className="text-xs font-semibold text-slate-500">Weighment Slip Note</p>
                                                                                <p className="text-sm text-slate-900 text-right break-words">{inv.weighmentSlipNote || '-'}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                )}
                                            </Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden space-y-3 sm:space-y-4">
                    {loading && invoices.length === 0 ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
                        </div>
                    ) : paginatedInvoices.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                            {loading ? 'Loading...' : 'No invoices found matching criteria.'}
                        </div>
                    ) : (
                        paginatedInvoices.map((inv) => (
                            <div key={inv.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* Card Header */}
                                <div className="bg-gray-50 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                                                {inv.invoiceNumber}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                                {formatDate(inv.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2 ml-2">
                                            {(inv.pdfUrl || inv.pdfURL) && (
                                                <button
                                                    onClick={() => handleViewPdf(inv.pdfUrl || inv.pdfURL)}
                                                    className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200"
                                                    title="View PDF"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleEditClick(inv)}
                                                className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="px-3 sm:px-4 py-3 space-y-2.5 sm:space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Insured Person</p>
                                            <p className="text-sm font-medium text-gray-900 truncate">{getInsuredPersonName(inv)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Other Party</p>
                                            <p className="text-sm font-medium text-gray-900 truncate">{getOtherPartyName(inv)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Product</p>
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {Array.isArray(inv.productName) ? inv.productName[0] : inv.productName}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Vehicle</p>
                                            <p className="text-sm font-medium text-gray-900">{inv.vehicleNumber || '-'}</p>
                                        </div>
                                    </div>

                                    {/* Verification Status */}
                                    <div className="pt-2 border-t border-gray-100">
                                        {inv.isRejected ? (
                                            <div className="flex items-center gap-2 text-red-700">
                                                <XCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">Rejected</span>
                                            </div>
                                        ) : inv.isVerified ? (
                                            <div className="flex items-center gap-2 text-green-700">
                                                <CheckCircle className="w-4 h-4" />
                                                <span className="text-sm font-medium">Verified</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                <button
                                                    onClick={() => handleVerifyInvoice(inv.id)}
                                                    className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                    Verify Invoice
                                                </button>
                                                <button
                                                    onClick={() => handleRejectInvoice(inv)}
                                                    disabled={rejectingInvoiceId === inv.id}
                                                    className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                                    title="Reject Invoice"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Insurance Section */}
                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-xs text-gray-500 font-medium">Insurance Status</p>
                                            {getInsuranceFileUrl(inv) ? (
                                                <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span>Uploaded</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-full">
                                                    <AlertCircle className="w-3 h-3" />
                                                    <span>Pending</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {getInsuranceFileUrl(inv) && (
                                                <button
                                                    onClick={() => window.open(toFullFileUrl(getInsuranceFileUrl(inv)), '_blank')}
                                                    className="flex-1 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-200 text-sm font-medium flex items-center justify-center gap-2"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setSelectedInvoiceForInsurance(inv);
                                                    setShowInsuranceModal(true);
                                                }}
                                                className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${getInsuranceFileUrl(inv)
                                                    ? 'text-orange-600 hover:bg-orange-50 border-orange-200'
                                                    : 'text-blue-600 hover:bg-blue-50 border-blue-200'
                                                    }`}
                                            >
                                                {getInsuranceFileUrl(inv) ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4" />
                                                        Replace
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="w-4 h-4" />
                                                        Upload
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        {inv.insurance?.uploadedAt && (
                                            <p className="text-xs text-gray-500 mt-1.5 text-center">
                                                Uploaded: {new Date(inv.insurance.uploadedAt).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination Controls - Responsive */}
                {totalPages > 1 && (
                    <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Invoice Modal - Responsive */}
            {isEditing && editingInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] p-3 sm:p-4">
                    <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center rounded-t-2xl sm:rounded-t-3xl z-10">
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Update Invoice</h3>
                            <button
                                onClick={closeModal}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        </div>

                        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                            {/* Image Upload Section */}
                            <div className="border border-gray-300 rounded-xl p-3 sm:p-4">
                                <label className="block text-sm font-medium text-slate-800 mb-2">Upload Weighment Slip</label>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                <div className="flex flex-col gap-3">
                                    {weightmentSlip ? (
                                        <div className="text-green-700 text-sm bg-green-50 p-2 rounded">{weightmentSlip?.name ?? ''}</div>
                                    ) : (
                                        <div className="text-gray-500 text-sm text-center">No new slip selected</div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                                    >
                                        📸 {weightmentSlip ? 'Replace Photo' : 'Upload New Photo'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">
                                Invoice: <span className="font-semibold">{editingInvoice?.invoiceNumber ?? ''}</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Invoice Type</label>
                                    <select
                                        value={formData.invoiceType}
                                        onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value as any })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                    >
                                        <option value="BUYER_INVOICE">Buyer Invoice</option>
                                        <option value="SUPPLIER_INVOICE">Supplier Invoice</option>
                                    </select>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Supplier Name</label>
                                    <input
                                        type="text"
                                        value={formData.supplierName}
                                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Enter supplier name"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Supplier Address</label>
                                    <textarea
                                        value={Array.isArray(formData.supplierAddress) ? (formData.supplierAddress[0] ?? '') : (formData.supplierAddress ?? '')}
                                        onChange={(e) => setFormData({ ...formData, supplierAddress: [e.target.value] })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Enter supplier address"
                                        rows={2}
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Bill To Name</label>
                                    <input
                                        type="text"
                                        value={formData.billToName}
                                        onChange={(e) => setFormData({ ...formData, billToName: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Enter buyer name"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Bill To Address</label>
                                    <textarea
                                        value={Array.isArray(formData.billToAddress) ? (formData.billToAddress[0] ?? '') : (formData.billToAddress ?? '')}
                                        onChange={(e) => setFormData({ ...formData, billToAddress: [e.target.value] })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Enter buyer address"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Ship To Name</label>
                                    <input
                                        type="text"
                                        value={formData.shipToName}
                                        onChange={(e) => setFormData({ ...formData, shipToName: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Ship to name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Place of Supply</label>
                                    <input
                                        type="text"
                                        value={formData.placeOfSupply}
                                        onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Place of supply"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Ship To Address</label>
                                    <textarea
                                        value={(Array.isArray(formData.shipToAddress) ? formData.shipToAddress[0] : formData.shipToAddress) ?? ''}
                                        onChange={(e) => setFormData({ ...formData, shipToAddress: [e.target.value] })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Shipping address"
                                        rows={2}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        value={formData.productName}
                                        onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Product name"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">HSN Code</label>
                                    <input
                                        type="text"
                                        value={formData.hsnCode}
                                        onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="HSN code"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Rate (₹)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.rate}
                                        onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Vehicle Number</label>
                                    <input
                                        type="text"
                                        value={formData.vehicleNumber}
                                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Vehicle number"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Truck Number</label>
                                    <input
                                        type="text"
                                        value={formData.truckNumber}
                                        onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Truck number"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Weighment Slip Note</label>
                                    <textarea
                                        value={formData.weighmentSlipNote}
                                        onChange={(e) => setFormData({ ...formData, weighmentSlipNote: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Additional notes"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={formData.invoiceDate}
                                        onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-800 mb-1">Terms</label>
                                    <input
                                        type="text"
                                        value={formData.terms}
                                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4309ac] focus:border-[#4309ac] focus:outline-none text-slate-800 bg-white text-sm"
                                        placeholder="Terms"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sticky bottom-0 bg-white rounded-b-2xl sm:rounded-b-3xl">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                                disabled={isRegenerating}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRegenerate}
                                className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 bg-[#4309ac] text-white rounded-xl font-medium hover:bg-[#350889] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                                disabled={isRegenerating}
                            >
                                {isRegenerating ? 'Updating...' : 'Update & Regenerate PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Insurance Upload Modal */}
            {showInsuranceModal && selectedInvoiceForInsurance && (
                <InsuranceUploadModal
                    invoice={selectedInvoiceForInsurance}
                    onClose={() => {
                        setShowInsuranceModal(false);
                        setSelectedInvoiceForInsurance(null);
                    }}
                    onSuccess={async (updatedInvoice?: any) => {
                        const fileUrl =
                            updatedInvoice?.fileUrl ??
                            updatedInvoice?.data?.fileUrl ??
                            updatedInvoice?.insurance?.fileUrl ??
                            undefined;
                        const invoiceId = selectedInvoiceForInsurance?.id;
                        const invoiceKey = selectedInvoiceForInsurance
                            ? getInvoiceKey(selectedInvoiceForInsurance)
                            : invoiceId;

                        if (invoiceKey && fileUrl) {
                            const uploadedAt = new Date().toISOString();
                            setInsuranceOverrides((prev) => ({
                                ...prev,
                                [invoiceKey]: { fileUrl, uploadedAt, fileType: 'application/pdf' },
                            }));
                            setInvoices((prev) =>
                                prev.map((i) =>
                                    getInvoiceKey(i) === invoiceKey
                                        ? {
                                            ...i,
                                            insurance: {
                                                fileUrl,
                                                uploadedAt,
                                                fileType: 'application/pdf',
                                            },
                                        }
                                        : i,
                                ),
                            );
                        } else if (updatedInvoice?.id || updatedInvoice?._id) {
                            setInvoices((prev) =>
                                prev.map((i) =>
                                    getInvoiceKey(i) === getInvoiceKey(updatedInvoice)
                                        ? { ...i, ...updatedInvoice }
                                        : i,
                                ),
                            );
                        }

                        setShowInsuranceModal(false);
                        setSelectedInvoiceForInsurance(null);
                        await fetchInvoices();
                    }}
                />
            )}
        </div>
    );
}
