import axios, { AxiosError } from "axios";

/**
 * Backend base URL
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

/* -------------------------------------------------------------------------- */
/* Types                                   */
/* -------------------------------------------------------------------------- */

export interface TruckLocation {
  lat: number;
  lng: number;
  speed?: number;
}

export interface TruckSessionInfo {
  id?: string;
  startedAt?: string;
  [key: string]: any;
}

export interface TrackingData {
  vehicleNumber: string;
  status: "online" | "offline" | "unknown";
  lastSeen?: string; // ISO Date string
  location?: TruckLocation;
  shareUrl?: string;
  shareToken?: string;
  session?: TruckSessionInfo;
  // Allow backend to send extra fields without breaking the UI
  [key: string]: any;
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
 * Track a vehicle by its number using the new trucks tracker API
 * Backend endpoint: GET /trucks/track/:vehicleNumber
 * @param vehicleNumber - The vehicle registration number (e.g. UP32AB1234)
 */
export const trackVehicle = async (
  vehicleNumber: string
): Promise<TrackingResponse> => {
  try {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const response = await axios.get<TrackingResponse>(
      `${API_BASE_URL}/trucks/track/${encodeURIComponent(vehicleNumber)}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );

    // Some backends may not wrap the response in { success, data }
    if ((response.data as any)?.data && (response.data as any)?.success !== undefined) {
      return response.data;
    }

    // If backend returns raw tracking object, normalise it
    const raw = response.data as any;
    const normalised: TrackingResponse = {
      success: raw.success ?? true,
      data: raw.data ?? {
        vehicleNumber: raw.vehicleNumber ?? vehicleNumber,
        status: raw.status ?? "unknown",
        lastSeen: raw.lastSeen,
        location: raw.location,
        shareUrl: raw.shareUrl ?? raw.shareURL,
        shareToken: raw.shareToken,
        session: raw.session,
      },
      message: raw.message,
    };

    return normalised;
  } catch (error) {
    const err = error as AxiosError<ApiError | any>;
    const message =
      (err.response?.data as any)?.message ||
      (err.response?.data as any)?.error ||
      "Failed to fetch vehicle location";
    throw { message };
  }
};