import axios, { AxiosError } from "axios";

/**
 * Backend base URL
 */
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/* -------------------------------------------------------------------------- */
/* Types                                   */
/* -------------------------------------------------------------------------- */

export interface TrackingData {
    vehicleNumber: string;
    currentLocation: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    lastUpdated: string; // ISO Date string
    status: 'moving' | 'stopped' | 'unreachable';
}

export interface TrackingResponse {
    success: boolean;
    data: TrackingData;
    message?: string;
}

export interface ApiError {
    success: boolean;
    message: string;
}

/* -------------------------------------------------------------------------- */
/* APIs                                    */
/* -------------------------------------------------------------------------- */

/**
 * Track a vehicle by its number
 * @param vehicleNumber - The vehicle registration number (e.g. UP32AB1234)
 */
export const trackVehicle = async (vehicleNumber: string): Promise<TrackingResponse> => {
    try {
        const token = localStorage.getItem("token");

        const response = await axios.post<TrackingResponse>(
            `${API_BASE_URL}/tracking/track`,
            { vehicleNumber },
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
        // Throw the specific error message from backend, or a generic fallback
        throw err.response?.data || { message: "Failed to fetch vehicle location" };
    }
};