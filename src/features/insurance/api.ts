import axios, { AxiosError } from "axios";

// 1. BACKEND BASE URL
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export const getBackendURL = () => {
  return API_BASE_URL.replace("/api", "");
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface InsuranceForm {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  supplierAddress: string[];
  placeOfSupply: string;
  billToName: string;
  billToAddress: string[];
  shipToName: string;
  shipToAddress: string[];
  productName: string[];
  hsnCode?: string;
  quantity: number;
  rate: number;
  amount: number;
  vehicleNumber?: string;
  truckNumber?: string;
  weighmentSlipNote?: string;
  isClaim?: boolean;
  claimDetails?: string;
  pdfUrl?: string;
  pdfURL?: string;
  createdAt?: string;
}

// ✅ NEW: Type for regenerating invoice
export interface RegenerateInvoicePayload {
  invoiceId: string;
  invoiceDate?: string;
  terms?: string;
  invoiceType?: "SUPPLIER_INVOICE" | "BUYER_INVOICE";
  supplierName?: string;
  supplierAddress?: string[];
  placeOfSupply?: string;
  billToName?: string;
  billToAddress?: string[];
  shipToName?: string;
  shipToAddress?: string[];
  productName?: string;
  hsnCode?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  truckNumber?: string;
  vehicleNumber?: string;
  weighmentSlipNote?: string;
  isClaim?: boolean;
  claimDetails?: string;
}

export type CreateInsuranceResponse = InsuranceForm;

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}

/* -------------------------------------------------------------------------- */
/* APIs                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Create a new Insurance Form (Invoice)
 * POST /invoices
 */
export const createInsuranceForm = async (
  formData: FormData
): Promise<CreateInsuranceResponse> => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.post(`${API_BASE_URL}/invoices`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    throw err.response?.data || { message: "Failed to create invoice" };
  }
};

/**
 * Get all insurance forms for the logged-in user
 * GET /invoices/user/:userId
 */
export const getMyInsuranceForms = async (): Promise<InsuranceForm[]> => {
  try {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!userData) {
      throw new Error("User not found. Please log in again.");
    }

    const user = JSON.parse(userData);
    if (!user.id) {
      throw new Error("User ID not found. Please log in again.");
    }

    const response = await axios.get(
      `${API_BASE_URL}/invoices/user/${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    throw err.response?.data || { message: "Failed to fetch invoices" };
  }
};

/**
 * ✅ NEW: Regenerate Invoice PDF
 * POST /invoices/regenerate
 *
 * Updates invoice data and regenerates PDF
 */
export const regenerateInvoice = async (
  payload: RegenerateInvoicePayload
): Promise<InsuranceForm> => {
  try {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      throw new Error("Authentication iffff required. Please log in.");
    }

    console.log("Regenerating invoice with payload:", token);

    if (!token) {
      throw new Error("Authentication required. Please log in.");
    }

    const response = await axios.post(
      `${API_BASE_URL}/invoices/regenerate`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;

    const message =
      err.response?.data?.message ||
      err.message ||
      "Failed to regenerate invoice";

    const errorMessage = Array.isArray(message) ? message.join(", ") : message;

    console.error("Regenerate invoice error:", errorMessage);

    throw new Error(errorMessage);
  }
};

/**
 * ✅ BONUS: Get single invoice by ID
 * GET /invoices/:id
 */
export const getInvoiceById = async (
  invoiceId: string
): Promise<InsuranceForm> => {
  try {
    const token = localStorage.getItem("token");

    const response = await axios.get(`${API_BASE_URL}/invoices/${invoiceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    const err = error as AxiosError<ApiError>;
    throw err.response?.data || { message: "Failed to fetch invoice" };
  }
};
