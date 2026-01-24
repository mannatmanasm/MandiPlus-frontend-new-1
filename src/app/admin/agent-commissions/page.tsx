'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/features/admin/context/AdminContext';
import { adminApi, AdminAgentCommissionSummaryRow } from '@/features/admin/api/admin.api';

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoneyINR(value: number) {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toFixed(2)}`;
  }
}

export default function AdminAgentCommissionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAdmin();

  const [rows, setRows] = useState<AdminAgentCommissionSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    const fetchRows = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await adminApi.getAgentCommissionSummaries();
        if (!res.success) {
          throw new Error(res.message || 'Failed to load agent commissions');
        }
        setRows(res.data || []);
      } catch (e: any) {
        setError(e.message || 'Failed to load agent commissions');
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [isAuthenticated, router]);

  const normalized = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      totalInvoices: toNumber(r.totalInvoices),
      totalCommissionEarned: toNumber(r.totalCommissionEarned),
      totalCommissionPaid: toNumber(r.totalCommissionPaid),
      pendingCommission: toNumber(r.pendingCommission),
    }));
  }, [rows]);

  const handleMarkPaid = async (row: AdminAgentCommissionSummaryRow) => {
    const commissionId = row.id || row.commissionId;
    if (!commissionId) {
      alert('No commission id found in this row. This backend response does not include a commission row id to mark as paid.');
      return;
    }

    try {
      setMarkingId(commissionId);
      const res = await adminApi.markCommissionPaid(commissionId);
      if (!res.success) {
        throw new Error(res.message || 'Failed to mark as paid');
      }
      // Refresh list
      const refreshed = await adminApi.getAgentCommissionSummaries();
      if (refreshed.success) setRows(refreshed.data || []);
    } catch (e: any) {
      alert(e.message || 'Failed to mark as paid');
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Agent Commissions</h1>
        <p className="text-sm text-gray-600 mt-1">Agent-wise commission summary</p>

        <div className="mt-6 overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg bg-white">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Agent Name</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Mandi Name</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Invoices</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commission Earned</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Commission Paid</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Pending</th>
                <th className="py-3.5 pl-3 pr-4 sm:pr-6 text-right text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {normalized.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500">
                    No agents found.
                  </td>
                </tr>
              ) : (
                normalized.map((row) => {
                  const commissionId = row.id || row.commissionId;
                  const canMarkPaid = Boolean(commissionId);
                  return (
                    <tr key={row.agentId} className="hover:bg-gray-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {row.agentName || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {row.mandiName || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {row.totalInvoices as any}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatMoneyINR(toNumber(row.totalCommissionEarned))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatMoneyINR(toNumber(row.totalCommissionPaid))}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatMoneyINR(toNumber(row.pendingCommission))}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleMarkPaid(row)}
                          disabled={!canMarkPaid || markingId === commissionId}
                          className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium ${
                            !canMarkPaid
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={!canMarkPaid ? 'Backend response did not include commission id' : 'Mark a commission entry as paid'}
                        >
                          {markingId === commissionId ? 'Marking...' : 'Mark Paid'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

