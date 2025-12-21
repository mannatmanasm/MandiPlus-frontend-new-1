import axios, { AxiosError } from "axios";

/**
 * Backend base URL
 * Reads from env or defaults to localhost
 */
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

/* -------------------------------------------------------------------------- */
/* Types                                    */
/* -------------------------------------------------------------------------- */

// The shape of the Insurance Form object returned by the database
export interface InsuranceForm {
    _id: string;
    user: string;
    supplierName: string;
    supplierAddress: string;
    placeOfSupply: string;
    buyerName: string;
    buyerAddress: string;
    itemName: string;
    hsn: string;
    quantity: number;
    rate: number;
    amount: number;
    vehicleNumber: string;
    notes?: string;
    weightmentSlipURL?: string; // Relative URL (e.g. /uploads/...)
    pdfURL: string;             // Relative URL
    createdAt: string;
}

// Response when creating a form
export interface CreateInsuranceResponse {
    success: boolean;
    data: InsuranceForm;
    message?: string;
}

// Response when fetching list of forms
export interface GetInsuranceResponse {
    success: boolean;
    data: InsuranceForm[];
}

export interface ApiError {
    success: boolean;
    message: string;
}

/* -------------------------------------------------------------------------- */
/* APIs                                    */
/* -------------------------------------------------------------------------- */

/**
 * Create a new Insurance Form
 * @param formData - Must be a FormData object containing text fields and the file
 */
export const createInsuranceForm = async (
    formData: FormData
): Promise<CreateInsuranceResponse> => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.post<CreateInsuranceResponse>(
            `${API_BASE_URL}/insurance/create`,
            formData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Axios automatically sets Content-Type to multipart/form-data
                    // with the correct boundary when passing a FormData object
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    } catch (error) {
        const err = error as AxiosError<ApiError>;
        throw err.response?.data || { message: "Failed to create insurance form" };
    }
};

/**
 * Get all insurance forms for the logged-in user
 */
export const getMyInsuranceForms = async (): Promise<InsuranceForm[]> => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.get<GetInsuranceResponse>(
            `${API_BASE_URL}/insurance/my-forms`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return response.data.data;
    } catch (error) {
        const err = error as AxiosError<ApiError>;
        throw err.response?.data || { message: "Failed to fetch insurance forms" };
    }
};