"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AgentProtectedRoute from "@/features/agent/components/AgentProtectedRoute";
import { useAuth } from "@/features/auth/context/AuthContext";
import { AgentCommissionSummary, getAgentCommissionSummary } from "@/features/commissions/api";
import { AgentInvoicesModal } from "@/features/agent/components/AgentInvoicesModal";

function getUserId(user: any): string | null {
  return user?.id || user?._id || user?.userId || null;
}

function formatMoneyINR(value: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toFixed(2)}`;
  }
}

export default function AgentDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const agentId = useMemo(() => getUserId(user), [user]);

  const [data, setData] = useState<AgentCommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showInvoices, setShowInvoices] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!agentId) {
        setError("Missing agent id");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const res = await getAgentCommissionSummary(agentId);
        setData(res);
      } catch (e: any) {
        setError(e.message || "Failed to load summary");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [agentId]);

  return (
    <AgentProtectedRoute>
      <div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Commission Summary</h1>
            <p className="text-sm text-gray-600 mt-1">
              {data ? `${data.agentName} • ${data.mandiName}` : "Your agent account"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push("/insurance")}
              className="inline-flex items-center justify-center rounded-md bg-[#4309ac] px-3 py-2 text-sm font-semibold text-white shadow hover:bg-[#340b85]"
            >
              Create Invoice
            </button>
            <button
              onClick={() => setShowInvoices(true)}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50"
            >
              My Invoices
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4309ac]" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{data.totalInvoices}</dd>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Commission Earned</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatMoneyINR(data.totalCommissionEarned)}
                </dd>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Total Commission Paid</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatMoneyINR(data.totalCommissionPaid)}
                </dd>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <dt className="text-sm font-medium text-gray-500 truncate">Pending Commission</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">
                  {formatMoneyINR(data.pendingCommission)}
                </dd>
              </div>
            </div>
          </div>
        )}
        <AgentInvoicesModal open={showInvoices} onClose={() => setShowInvoices(false)} />
      </div>
    </AgentProtectedRoute>
  );
}

