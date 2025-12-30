'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAdmin } from '@/features/admin/context/AdminContext';
import { formatNumber } from '@/features/admin/utils/format';

interface ActivityItem {
    id: string;
    type: 'user' | 'invoice';
    description: string;
    timestamp: string;
}

interface DashboardStats {
    totalUsers: number;
    totalForms: number;
    recentActivity: ActivityItem[];
}

export default function DashboardPage() {
    const router = useRouter();
    const { isAuthenticated } = useAdmin();

    const [stats, setStats] = useState<DashboardStats>({
        totalUsers: 0,
        totalForms: 0,
        recentActivity: []
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
            return;
        }

        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                setError('');
                const token = localStorage.getItem('adminToken');
                const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
                const headers = { Authorization: `Bearer ${token}` };

                // 1. Fetch Users and Invoices in parallel
                const [usersRes, invoicesRes] = await Promise.all([
                    axios.get(`${baseUrl}/users`, { headers }),
                    axios.get(`${baseUrl}/invoices`, { headers })
                ]);

                // 2. Extract Data (Handle potential { data: [...] } wrapper)
                const users = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.data || [];
                const invoices = Array.isArray(invoicesRes.data) ? invoicesRes.data : invoicesRes.data.data || [];

                // 3. Generate Recent Activity Feed (Merge & Sort)
                // Convert Users to Activity
                const userActivities: ActivityItem[] = users.map((u: any) => ({
                    id: u.id || u._id,
                    type: 'user',
                    description: `New User Joined: ${u.mobileNumber}`,
                    timestamp: u.createdAt
                }));

                // Convert Invoices to Activity
                const invoiceActivities: ActivityItem[] = invoices.map((inv: any) => ({
                    id: inv.id || inv._id,
                    type: 'invoice',
                    description: `Invoice Created: ${inv.invoiceNumber} (${inv.supplierName})`,
                    timestamp: inv.createdAt || inv.invoiceDate
                }));

                // Combine, Sort by Date (Desc), and take top 5
                const combinedActivity = [...userActivities, ...invoiceActivities]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 5);

                // 4. Update State
                setStats({
                    totalUsers: users.length,
                    totalForms: invoices.length,
                    recentActivity: combinedActivity
                });

            } catch (err: any) {
                console.error('Failed to fetch dashboard data:', err);
                setError('Failed to load dashboard data. Ensure backend is running.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [isAuthenticated, router]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
                <p className="text-sm text-red-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mt-8">
                    <h2 className="text-lg leading-6 font-medium text-gray-900">Overview</h2>
                    <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

                        {/* --- TOTAL USERS CARD --- */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                    <div className="shrink-0 bg-green-500 rounded-md p-3">
                                        {/* User Icon */}
                                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                                            <dd className="flex items-baseline">
                                                <div className="text-2xl font-semibold text-gray-900">
                                                    {formatNumber(stats.totalUsers)}
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            {/* <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                    <a href="/admin/users" className="font-medium text-green-600 hover:text-green-500">
                                        View all users
                                    </a>
                                </div>
                            </div> */}
                        </div>

                        {/* --- TOTAL FORMS CARD --- */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                    <div className="shrink-0 bg-blue-500 rounded-md p-3">
                                        {/* Document Icon */}
                                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Total Invoices</dt>
                                            <dd className="flex items-baseline">
                                                <div className="text-2xl font-semibold text-gray-900">
                                                    {formatNumber(stats.totalForms)}
                                                </div>
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            {/* <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                    <a href="/admin/insurance-forms" className="font-medium text-blue-600 hover:text-blue-500">
                                        View all invoices
                                    </a>
                                </div>
                            </div> */}
                        </div>

                        {/* --- RECENT ACTIVITY SUMMARY CARD --- */}
                        <div className="bg-white overflow-hidden shadow rounded-lg">
                            <div className="px-4 py-5 sm:p-6">
                                <div className="flex items-center">
                                    <div className="shrink-0 bg-purple-500 rounded-md p-3">
                                        {/* Clock Icon */}
                                        <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <dl>
                                            <dt className="text-sm font-medium text-gray-500 truncate">Latest Activity</dt>
                                            <dd className="text-sm text-gray-900 mt-1">
                                                {stats.recentActivity.length > 0
                                                    ? 'System is active'
                                                    : 'No recent activity'}
                                            </dd>
                                        </dl>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-4 sm:px-6">
                                <div className="text-sm">
                                    <span className="text-gray-500">
                                        Updated just now
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RECENT ACTIVITY LIST --- */}
                <div className="mt-8">
                    <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activity Log</h2>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-gray-200">
                            {stats.recentActivity.map((activity) => (
                                <li key={`${activity.type}-${activity.id}`}>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-green-600 truncate">
                                                {activity.description}
                                            </p>
                                            <div className="ml-2 shrink-0 flex">
                                                <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${activity.type === 'user'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {activity.type === 'user' ? 'New User' : 'New Invoice'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    {/* Calendar Icon */}
                                                    <svg className="shrink-0 mr-1.5 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                                    </svg>
                                                    {new Date(activity.timestamp).toLocaleString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {stats.recentActivity.length === 0 && (
                                <li className="text-center py-4 text-gray-500">
                                    No activity found.
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}