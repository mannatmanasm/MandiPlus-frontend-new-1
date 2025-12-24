import axios, { AxiosError } from "axios";

// 1. BACKEND BASE URL 
// (Updated to port 3000 for NestJS, based on your previous logs)
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";

// Helper to remove '/api' if we need the root URL for images/PDFs
export const getBackendURL = () => {
    return API_BASE_URL.replace('/api', '');
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

// The shape of the Invoice/Insurance Form returned by the Backend
export interface InsuranceForm {
    id: string;              // Postgres uses 'id', not '_id'
    invoiceNumber: string;
    invoiceDate: string;
    supplierName: string;
    supplierAddress: string[]; // Backend returns arrays now
    placeOfSupply: string;
    billToName: string;
    billToAddress: string[];
    shipToName: string;
    shipToAddress: string[];
    productName: string[];
    hsnCode?: string;        // Backend uses hsnCode
    quantity: number;
    rate: number;
    amount: number;
    vehicleNumber?: string;
    weighmentSlipNote?: string;

    // PDF URL (Handle both naming conventions just in case)
    pdfUrl?: string;
    pdfURL?: string;

    createdAt?: string;
}

// The Backend returns the object directly, NOT wrapped in { success: true, data: ... }
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

        // Note: Endpoint is '/invoices' based on your NestJS Controller
        const response = await axios.post(
            `${API_BASE_URL}/invoices`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        // Return the data directly
        return response.data;
    } catch (error) {
        const err = error as AxiosError<ApiError>;
        throw err.response?.data || { message: "Failed to create invoice" };
    }
};

/**
 * Get all insurance forms for the logged-in user
 * GET /invoices
 */
export const getMyInsuranceForms = async (): Promise<InsuranceForm[]> => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.get(
            `${API_BASE_URL}/invoices`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        // The backend returns the array of invoices directly
        return response.data;
    } catch (error) {
        const err = error as AxiosError<ApiError>;
        throw err.response?.data || { message: "Failed to fetch invoices" };
    }
};