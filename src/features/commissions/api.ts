import axios, { AxiosError } from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export interface AgentCommissionSummary {
  agentId: string;
  agentName: string;
  mandiName: string;
  totalInvoices: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingCommission: number;
}

export const getAgentCommissionSummary = async (agentId: string): Promise<AgentCommissionSummary> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/commissions/agent/${agentId}/summary`);
    const d = response.data;
    return {
      ...d,
      totalInvoices: Number(d.totalInvoices ?? 0),
      totalCommissionEarned: Number(d.totalCommissionEarned ?? 0),
      totalCommissionPaid: Number(d.totalCommissionPaid ?? 0),
      pendingCommission: Number(d.pendingCommission ?? 0),
    };
  } catch (error) {
    const err = error as AxiosError<{ message: string }>;
    throw new Error(err.response?.data?.message || "Failed to load commission summary");
  }
};

