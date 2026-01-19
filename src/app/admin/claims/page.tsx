'use client';

import { useEffect, useState } from 'react';
import { adminApi, ClaimRequest, ClaimStatus, UpdateClaimStatusDto } from '@/features/admin/api/admin.api'; // Adjust path if needed
import {
    FunnelIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    EyeIcon,
    PencilSquareIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function ClaimsPage() {
    const [claims, setClaims] = useState<ClaimRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: '' as ClaimStatus | '',
        truckNumber: '',
    });

    // Modal States
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null);

    // Form States
    const [updateForm, setUpdateForm] = useState<UpdateClaimStatusDto>({
        status: ClaimStatus.PENDING,
        surveyorName: '',
        surveyorContact: '',
        notes: '',
    });
    const [newClaimTruck, setNewClaimTruck] = useState('');

    // Fetch Claims
    const fetchClaims = async () => {
        setLoading(true);
        try {
            const response = await adminApi.getClaims({
                status: filters.status || undefined,
                truckNumber: filters.truckNumber || undefined,
            });
            if (response.success && response.data) {
                setClaims(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch claims", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, [filters]);

    // Handlers
    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClaim) return;

        try {
            await adminApi.updateClaimStatus(selectedClaim.id, updateForm);
            alert('Status updated successfully');
            setShowUpdateModal(false);
            fetchClaims();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleCreateClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminApi.createClaimForUser(newClaimTruck);
            alert('Claim created successfully');
            setShowCreateModal(false);
            setNewClaimTruck('');
            fetchClaims();
        } catch (error) {
            alert('Failed to create claim. Ensure invoice exists for this truck.');
        }
    };

    const openUpdateModal = (claim: ClaimRequest) => {
        setSelectedClaim(claim);
        setUpdateForm({
            status: claim.status,
            surveyorName: claim.surveyorName || '',
            surveyorContact: claim.surveyorContact || '',
            notes: claim.notes || '',
        });
        setShowUpdateModal(true);
    };

    // Helper for Status Badge Color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            case 'SURVEYOR_ASSIGNED': return 'bg-blue-100 text-blue-800';
            case 'SETTLED': return 'bg-purple-100 text-purple-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-8">

            {/* Header */}
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Claim Requests</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Manage all insurance claims, assign surveyors, and update status.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        New Claim
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-8 flex gap-4 flex-wrap bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative flex-1 min-w-[200px]">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block text-black w-full rounded-md border-gray-300 pl-10 focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 border"
                        placeholder="Search by Truck Number..."
                        value={filters.truckNumber}
                        onChange={(e) => setFilters({ ...filters, truckNumber: e.target.value })}
                    />
                </div>
                <div className="w-48">
                    <select
                        className="block text-black w-full rounded-md border-gray-300 border py-2 px-3 focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    >
                        <option value="">All Statuses</option>
                        {Object.values(ClaimStatus).map((status) => (
                            <option key={status} value={status}>{status.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Request ID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Truck / Invoice</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Surveyor</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-10">Loading claims...</td></tr>
                                    ) : claims.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-10 text-gray-500">No claims found</td></tr>
                                    ) : (
                                        claims.map((claim) => (
                                            <tr key={claim.id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                    {claim.id.slice(0, 8)}...
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div className="font-medium text-gray-900">{claim.invoice?.vehicleNumber || 'N/A'}</div>
                                                    <div className="text-xs text-gray-400">{claim.invoice?.invoiceNumber}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {claim.surveyorName ? (
                                                        <div>
                                                            <div>{claim.surveyorName}</div>
                                                            <div className="text-xs">{claim.surveyorContact}</div>
                                                        </div>
                                                    ) : <span className="text-gray-400 italic">Not Assigned</span>}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {new Date(claim.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(claim.status)}`}>
                                                        {claim.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex justify-end gap-2">
                                                        {claim.claimFormUrl && (
                                                            <a href={claim.claimFormUrl} target="_blank" className="text-blue-600 hover:text-blue-900" title="View Form">
                                                                <EyeIcon className="w-5 h-5" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => openUpdateModal(claim)}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Update Status"
                                                        >
                                                            <PencilSquareIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- UPDATE STATUS MODAL --- */}
            {showUpdateModal && selectedClaim && (
                <div className="relative z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                <form onSubmit={handleStatusUpdate}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">Update Claim Status</h3>
                                            <button type="button" onClick={() => setShowUpdateModal(false)}>
                                                <XMarkIcon className="w-6 h-6 text-gray-400" />
                                            </button>
                                        </div>
                                        <div className="mt-4 space-y-4">
                                            {/* Status Select */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                                <select
                                                    className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                                    value={updateForm.status}
                                                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value as ClaimStatus })}
                                                >
                                                    {Object.values(ClaimStatus).map(s => (
                                                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Surveyor Fields - Show only if needed or always visible */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Surveyor Name</label>
                                                    <input
                                                        type="text"
                                                        className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                                        value={updateForm.surveyorName}
                                                        onChange={(e) => setUpdateForm({ ...updateForm, surveyorName: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Contact</label>
                                                    <input
                                                        type="text"
                                                        className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                                        value={updateForm.surveyorContact}
                                                        onChange={(e) => setUpdateForm({ ...updateForm, surveyorContact: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                                                <textarea
                                                    rows={3}
                                                    className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                                    value={updateForm.notes}
                                                    onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button type="submit" className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm">
                                            Update
                                        </button>
                                        <button type="button" onClick={() => setShowUpdateModal(false)} className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE CLAIM MODAL --- */}
            {showCreateModal && (
                <div className="relative z-50">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm">
                                <form onSubmit={handleCreateClaim}>
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Create New Claim</h3>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Truck Number</label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. MH12AB1234"
                                                className="mt-1 block w-full rounded-md border-gray-300 border py-2 px-3 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                                                value={newClaimTruck}
                                                onChange={(e) => setNewClaimTruck(e.target.value)}
                                            />
                                            <p className="mt-2 text-xs text-gray-500">Will link to the latest invoice for this truck.</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                        <button type="submit" className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 sm:ml-3 sm:w-auto sm:text-sm">
                                            Create
                                        </button>
                                        <button type="button" onClick={() => setShowCreateModal(false)} className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}