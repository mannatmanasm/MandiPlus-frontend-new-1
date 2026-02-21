'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  InsurancePaymentRow,
  UpdateInsurancePaymentPayload,
  adminApi,
} from '@/features/admin/api/admin.api';
import { useAdmin } from '@/features/admin/context/AdminContext';

const PAYMENT_STATUS_OPTIONS = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
];

function formatCurrency(value: number) {
  return `Rs ${Math.round(value || 0).toLocaleString('en-IN')}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-IN');
}

function getEffectivePaidAmount(row: InsurancePaymentRow): number {
  return row.paymentStatus === 'PAID' ? Number(row.paymentAmount || 0) : 0;
}

function getEffectiveBalance(row: InsurancePaymentRow): number {
  const premium = Number(row.premiumAmount || 0);
  const paid = getEffectivePaidAmount(row);
  return Math.max(premium - paid, 0);
}

function toInputDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export default function AdminInsurancePaymentsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAdmin();
  const [rows, setRows] = useState<InsurancePaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  const [editing, setEditing] = useState<InsurancePaymentRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UpdateInsurancePaymentPayload>({});

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminApi.getInsurancePayments({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        paymentStatus: paymentStatus || undefined,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to load insurance payments');
      }
      setRows(response.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load insurance payments');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }
    fetchRows();
  }, [isAuthenticated, router, fromDate, toDate, paymentStatus]);

  const totalPremium = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.premiumAmount || 0), 0),
    [rows],
  );

  const totalPayment = useMemo(
    () => rows.reduce((sum, row) => sum + getEffectivePaidAmount(row), 0),
    [rows],
  );

  const openEditModal = (row: InsurancePaymentRow) => {
    setEditing(row);
    setForm({
      premiumAmount: Number(row.premiumAmount || 0),
      paymentAmount: Number(row.paymentAmount || 0),
      paymentStatus: row.paymentStatus,
      isPaymentRequired: Boolean(row.isPaymentRequired),
      paymentCompletedAt: toInputDateTimeLocal(row.paymentCompletedAt),
      remarks: row.remarks || '',
    });
  };

  const closeEditModal = () => {
    setEditing(null);
    setForm({});
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const payload: UpdateInsurancePaymentPayload = {
        premiumAmount:
          form.premiumAmount === undefined ? undefined : Number(form.premiumAmount),
        paymentAmount:
          form.paymentAmount === undefined ? undefined : Number(form.paymentAmount),
        paymentStatus: form.paymentStatus,
        isPaymentRequired: form.isPaymentRequired,
        paymentCompletedAt: form.paymentCompletedAt || null,
        remarks: form.remarks ?? null,
      };

      const response = await adminApi.updateInsurancePayment(
        editing.invoiceId,
        payload,
      );
      if (!response.success) {
        throw new Error(response.message || 'Failed to update insurance payment');
      }

      closeEditModal();
      await fetchRows();
    } catch (err: any) {
      alert(err?.message || 'Failed to update insurance payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-900">
            Insurance Payments
          </h1>
          <p className="text-sm text-gray-600">
            Mirror payment tracking synced with invoices (bi-directional).
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              {PAYMENT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setPaymentStatus('');
              }}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Reset Filters
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">Rows</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Premium Amount
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalPremium)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Payment Amount
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {formatCurrency(totalPayment)}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Invoice Number
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Buyer / Insured
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Premium
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Updated At
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      Loading insurance payments...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-sm text-gray-500"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-gray-900">{row.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.buyer || row.insuredPerson || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatCurrency(Number(row.premiumAmount || 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatCurrency(getEffectivePaidAmount(row))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatCurrency(getEffectiveBalance(row))}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.paymentStatus}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDate(row.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(row)}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Edit Payment: {editing.invoiceNumber}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Updating here syncs both insurance_payments and invoices.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm text-gray-700">
                Premium Amount
                <input
                  type="number"
                  min="0"
                  value={form.premiumAmount ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      premiumAmount: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-gray-700">
                Payment Amount
                <input
                  type="number"
                  min="0"
                  value={form.paymentAmount ?? ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentAmount: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>

              <label className="text-sm text-gray-700">
                Payment Status
                <select
                  value={form.paymentStatus || 'NOT_REQUIRED'}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, paymentStatus: e.target.value }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {PAYMENT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                Payment Completed At
                <input
                  type="datetime-local"
                  value={typeof form.paymentCompletedAt === 'string' ? form.paymentCompletedAt : ''}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentCompletedAt: e.target.value || null,
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
            </div>

            <label className="mt-3 block text-sm text-gray-700">
              Remarks
              <textarea
                rows={3}
                value={typeof form.remarks === 'string' ? form.remarks : ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, remarks: e.target.value }))
                }
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>

            <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(form.isPaymentRequired)}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    isPaymentRequired: e.target.checked,
                  }))
                }
              />
              Is Payment Required
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={saving}
                className="rounded-md bg-[#4309ac] px-4 py-2 text-sm font-semibold text-white hover:bg-[#35088a] disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
