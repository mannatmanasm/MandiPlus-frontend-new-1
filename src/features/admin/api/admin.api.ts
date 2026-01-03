import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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

interface InsuranceForm {
    _id: string;
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
}

interface LoginResponse {
    success: boolean;
    token: string;
    admin: {
        email: string;
        role: string;
    };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

class AdminApi {
    private client: AxiosInstance;
    private authToken: string | null = null;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true,
        });

        // Add request interceptor to add auth token
        this.client.interceptors.request.use(
            (config) => {
                const token = this.authToken || (typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null);
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
                    // Handle unauthorized access
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('adminToken');
                        window.location.href = '/admin/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    public setAuthToken = (token: string | null) => {
        this.authToken = token;
        if (token && typeof window !== 'undefined') {
            localStorage.setItem('adminToken', token);
        } else if (token === null && typeof window !== 'undefined') {
            localStorage.removeItem('adminToken');
        }
    };

    public clearAuthToken = () => {
        this.setAuthToken(null);
    };

    public login = async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response = await this.client.post<ApiResponse<LoginResponse>>('/admin/login', { email, password });
            if (response.data.success && response.data.data?.token) {
                this.setAuthToken(response.data.data.token);
            }
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
                error: error.message,
            };
        }
    };

    public getUsers = async (page: number = 1, limit: number = 10, searchTerm: string = ''): Promise<ApiResponse<{ users: User[]; total: number }>> => {
        try {
            const response = await this.client.get<ApiResponse<{ users: User[]; total: number }>>('/admin/users');
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch users',
                error: error.message,
            };
        }
    };

    public getInsuranceForms = async (page: number = 1, limit: number = 10, searchTerm: string = ''): Promise<ApiResponse<{ forms: InsuranceForm[]; total: number }>> => {
        try {
            const response = await this.client.get<ApiResponse<{ forms: InsuranceForm[]; total: number }>>('/admin/insurance-forms');
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch insurance forms',
                error: error.message,
            };
        }
    };

    public getUserInsuranceForms = async (userId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{ forms: InsuranceForm[]; total: number }>> => {
        try {
            const response = await this.client.get<ApiResponse<{ forms: InsuranceForm[]; total: number }>>(`/admin/user/${userId}/forms`);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to fetch user insurance forms',
                error: error.message,
            };
        }
    };

    public getDashboardStats = async (): Promise<ApiResponse<{
        totalUsers: number;
        totalForms: number;
        recentActivity: Array<{
            id: string;
            type: string;
            description: string;
            timestamp: string;
        }>;
    }>> => {
        try {
            // In a real implementation, you would have a dedicated endpoint for dashboard stats
            // For now, we'll fetch both users and forms and calculate the counts
            const [usersResponse, formsResponse] = await Promise.all([
                this.getUsers(),
                this.getInsuranceForms()
            ]);

            return {
                success: true,
                data: {
                    totalUsers: usersResponse.success ? (usersResponse.data as any)?.count || 0 : 0,
                    totalForms: formsResponse.success ? (formsResponse.data as any)?.count || 0 : 0,
                    recentActivity: [] // This would come from a dedicated endpoint
                }
            };
        } catch (error: any) {
            return {
                success: false,
                message: 'Failed to fetch dashboard stats',
                error: error.message,
            };
        }
    };
}

export const adminApi = new AdminApi();
