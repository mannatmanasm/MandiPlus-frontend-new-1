import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
  error?: string;
}

interface User {
  _id: string;
  mobileNumber: string;
  category: string;
  state: string;
  createdAt: string;
  totalForms: number;
}

export interface InsuranceForm {
  _id: string;
  id?: string; // Handle both _id (mongoose) and id (typeorm) depending on backend
  user: {
    _id: string;
    mobileNumber: string;
    category?: string;
  };
  invoiceNumber: string;
  supplier: string;
  buyer: string;
  item: string;
  quantity: number;
  amount: number;
  date: string;
  invoicePdfUrl?: string;
  weightSlipPdfUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Added fields relevant to claims
  truckNumber?: string;
  vehicleNumber?: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  admin: {
    email: string;
    role: string;
  };
}

export interface RegenerateInvoicePayload {
  invoiceId: string;
  invoiceDate?: string;
  terms?: string;
  supplierName?: string;
  supplierAddress?: string | string[];
  billToName?: string;
  billToAddress?: string | string[];
  productName?: string;
  quantity?: number;
  rate?: number;
  amount?: number;
  // Add other invoice fields as needed
}

export interface InvoiceFilterParams {
  invoiceType?: string;
  startDate?: string;
  endDate?: string;
  supplierName?: string;
  buyerName?: string;
  userId?: string;
}

// --- ✅ NEW: Claim Request Interfaces ---

export enum ClaimStatus {
  PENDING = 'PENDING',
  SURVEYOR_ASSIGNED = 'SURVEYOR_ASSIGNED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
}

export interface ClaimRequest {
  id: string;
  status: ClaimStatus;
  createdAt: string;
  invoice: InsuranceForm;
  surveyorName?: string;
  surveyorContact?: string;
  notes?: string;
  claimFormUrl?: string;
  // New individual media fields
  fir?: string | null; // FIR document URL
  gpsPictures?: string | null; // GPS pictures URL
  accidentPic?: string | null; // Accident picture URL
  inspectionReport?: string | null; // Inspection report URL
  weighmentSlip?: string | null; // Weighment slip URL
  damageFormUrl?: string | null; // Damage form PDF URL
  // Legacy field (deprecated)
  supportedMedia?: string[];
}

export interface FilterClaimRequestsDto {
  status?: ClaimStatus;
  invoiceId?: string;
  truckNumber?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateClaimStatusDto {
  status: ClaimStatus;
  surveyorName?: string;
  surveyorContact?: string;
  notes?: string;
}

// ----------------------------------------

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

class AdminApi {
  private client: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    // Add request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token =
          this.authToken ||
          (typeof window !== "undefined"
            ? localStorage.getItem("adminToken")
            : null);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("adminToken");
            window.location.href = "/admin/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  public setAuthToken = (token: string | null) => {
    this.authToken = token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("adminToken", token);
    } else if (token === null && typeof window !== "undefined") {
      localStorage.removeItem("adminToken");
    }
  };

  public clearAuthToken = () => {
    this.setAuthToken(null);
  };

  public login = async (
    email: string,
    password: string
  ): Promise<ApiResponse<LoginResponse>> => {
    try {
      const response = await this.client.post<ApiResponse<LoginResponse>>(
        "/admin/login",
        { email, password }
      );
      if (response.data.success && response.data.data?.token) {
        this.setAuthToken(response.data.data.token);
      }
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
        error: error.message,
      };
    }
  };

  public getUsers = async (
    page: number = 1,
    limit: number = 10,
    searchTerm: string = ""
  ): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    try {
      const response = await this.client.get<
        ApiResponse<{ users: User[]; total: number }>
      >("/admin/users");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch users",
        error: error.message,
      };
    }
  };

  public getInsuranceForms = async (
    page: number = 1,
    limit: number = 10,
    searchTerm: string = ""
  ): Promise<ApiResponse<{ forms: InsuranceForm[]; total: number }>> => {
    try {
      const response = await this.client.get<
        ApiResponse<{ forms: InsuranceForm[]; total: number }>
      >("/admin/insurance-forms");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch insurance forms",
        error: error.message,
      };
    }
  };

  public getUserInsuranceForms = async (
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<{ forms: InsuranceForm[]; total: number }>> => {
    try {
      const response = await this.client.get<
        ApiResponse<{ forms: InsuranceForm[]; total: number }>
      >(`/admin/user/${userId}/forms`);
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to fetch user insurance forms",
        error: error.message,
      };
    }
  };

  public filterInvoices = async (
    filters: InvoiceFilterParams
  ): Promise<ApiResponse<any[]>> => {
    try {
      const response = await this.client.get("/invoices/admin/filter", {
        params: filters,
      });
      if (Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data,
        };
      }
      return response.data;
    } catch (error: any) {
      console.error("Filter API Error:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to filter invoices",
        error: error.message,
      };
    }
  };

  public exportInvoices = async (body: {
    invoiceType?: string;
    startDate?: string;
    endDate?: string;
    invoiceIds?: string[];
  }): Promise<Blob | null> => {
    try {
      const response = await this.client.post("/invoices/admin/export", body, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Export failed", error);
      return null;
    }
  };

  // Regenerate invoice with new data
  public regenerateInvoice = async (payload: RegenerateInvoicePayload): Promise<ApiResponse<any>> => {
    try {
      const response = await this.client.post<ApiResponse<any>>(
        '/invoices/regenerate',
        payload
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to regenerate invoice',
        error: error.message,
      };
    }
  };


  // ============================================================
  // ✅ CLAIM REQUESTS MANAGEMENT (ADMIN)
  // ============================================================

  /**
   * Get all claims with optional filters
   * Filters: status, truckNumber, invoiceId
   */
  public getClaims = async (
    filters?: FilterClaimRequestsDto
  ): Promise<ApiResponse<ClaimRequest[]>> => {
    try {
      const response = await this.client.get<any>(
        "/claim-requests/admin",
        { params: filters }
      );

      // Handle both wrapped response and direct array
      let claims: ClaimRequest[] = [];
      
      // Debug: Log the raw response
      console.log("Raw API response:", response.data);
      console.log("Is array?", Array.isArray(response.data));
      
      if (Array.isArray(response.data)) {
        // Direct array response
        claims = response.data;
        console.log("Using direct array, claims count:", claims.length);
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        // Wrapped in ApiResponse object
        claims = response.data.data;
        console.log("Using wrapped data.data, claims count:", claims.length);
      } else if (response.data?.success && Array.isArray(response.data.data)) {
        // Another wrapped format
        claims = response.data.data;
        console.log("Using wrapped success.data, claims count:", claims.length);
      } else {
        console.warn("Unexpected response format:", response.data);
      }

      // Normalize status field (backend may return lowercase, enum expects uppercase)
      claims = claims.map((claim) => ({
        ...claim,
        status: (claim.status?.toUpperCase() as ClaimStatus) || ClaimStatus.PENDING,
      }));
      
      console.log("Final normalized claims:", claims.length);

      return {
        success: true,
        data: claims,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch claims",
        error: error.message,
      };
    }
  };

  /**
   * Get a single claim by ID
   */
  public getClaimById = async (
    id: string
  ): Promise<ApiResponse<ClaimRequest>> => {
    try {
      const response = await this.client.get<ApiResponse<ClaimRequest>>(
        `/claim-requests/${id}`
      );

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to fetch claim details",
        error: error.message,
      };
    }
  };

  /**
   * Create a claim on behalf of a user using Truck Number
   * Attaches claim to user's latest invoice for that truck
   */
  public createClaimForUser = async (
    truckNumber: string
  ): Promise<ApiResponse<ClaimRequest>> => {
    try {
      const response = await this.client.post<ApiResponse<ClaimRequest>>(
        "/claim-requests/by-truck",
        { truckNumber }
      );

      return {
        success: true,
        data: response.data.data,
        message: "Claim created successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to create claim",
        error: error.message,
      };
    }
  };

  /**
   * Update claim status
   * Actions: Assign Surveyor | Approve | Reject | Settle
   */
  public updateClaimStatus = async (
    id: string,
    updateData: UpdateClaimStatusDto
  ): Promise<ApiResponse<ClaimRequest>> => {
    try {
      const response = await this.client.patch<ApiResponse<ClaimRequest>>(
        `/claim-requests/${id}/status`,
        updateData
      );

      return {
        success: true,
        data: response.data.data,
        message: "Claim status updated successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message:
          error.response?.data?.message || "Failed to update claim status",
        error: error.message,
      };
    }
  };

  /**
   * Upload media file for a claim request
   * POST /claim-requests/:id/media/:mediaType
   */
  public uploadClaimMedia = async (
    claimId: string,
    mediaType: 'fir' | 'gpsPictures' | 'accidentPic' | 'inspectionReport' | 'weighmentSlip',
    file: File
  ): Promise<ApiResponse<ClaimRequest>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await this.client.post<ClaimRequest>(
        `/claim-requests/${claimId}/media/${mediaType}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return {
        success: true,
        data: response.data,
        message: "Media uploaded successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to upload media",
        error: error.message,
      };
    }
  };

  /**
   * Submit damage form for a claim request
   * POST /claim-requests/:id/damage-form
   */
  public submitDamageForm = async (
    claimId: string,
    damageFormData: {
      damageCertificateDate: string;
      transportReceiptMemoNo: string;
      transportReceiptDate: string;
      loadedWeightKg: number;
      productName: string;
      fromParty: string;
      forParty: string;
      accidentDate: string;
      accidentLocation: string;
      accidentDescription: string;
      agreedDamageAmountNumber: number;
      agreedDamageAmountWords: string;
      authorizedSignatoryName: string;
    }
  ): Promise<ApiResponse<ClaimRequest>> => {
    try {
      const response = await this.client.post<ClaimRequest>(
        `/claim-requests/${claimId}/damage-form`,
        damageFormData
      );
      return {
        success: true,
        data: response.data,
        message: "Damage form submitted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to submit damage form",
        error: error.message,
      };
    }
  };

  // ============================================================
  // END CLAIM REQUESTS
  // ============================================================


  public getDashboardStats = async (): Promise<
    ApiResponse<{
      totalUsers: number;
      totalForms: number;
      totalClaims: number; // Added claims count
      recentActivity: Array<{
        id: string;
        type: string;
        description: string;
        timestamp: string;
      }>;
    }>
  > => {
    try {
      const [usersResponse, formsResponse, claimsResponse] = await Promise.all([
        this.getUsers(),
        this.getInsuranceForms(),
        this.getClaims(), // Fetch claims for stats
      ]);

      return {
        success: true,
        data: {
          totalUsers: usersResponse.success
            ? (usersResponse.data as any)?.count || (usersResponse.data as any)?.users?.length || 0
            : 0,
          totalForms: formsResponse.success
            ? (formsResponse.data as any)?.count || (formsResponse.data as any)?.forms?.length || 0
            : 0,
          totalClaims: claimsResponse.success && Array.isArray(claimsResponse.data)
            ? claimsResponse.data.length
            : 0,
          recentActivity: [],
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Failed to fetch dashboard stats",
        error: error.message,
      };
    }
  };
}

export const adminApi = new AdminApi();