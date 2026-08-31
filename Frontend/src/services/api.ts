import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse } from 'axios';

// Configure standard axios instance
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for adding auth tokens later
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Handle unauthorized, redirect to login, etc.
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Define API boundary types (example structures)
export interface Person {
    id: string;
    name: string;
    type: string;
    email?: string;
    phone?: string;
    status: string;
}

export interface Job {
    id: string;
    title: string;
    org: string;
    status: string;
    progress: string;
    tag: string;
}

// API Service modules
export const PeopleService = {
    getAll: async () => {
        // const response = await apiClient.get<Person[]>('/people');
        // return response.data;
        console.warn("Using mock API for getAll People");
        return [];
    },
    getById: async (id: string) => {
        // const response = await apiClient.get<Person>(`/people/${id}`);
        // return response.data;
        console.warn(`Using mock API for getById Person ${id}`);
        return null;
    }
};

export const JobsService = {
    getAll: async () => {
        // const response = await apiClient.get<Job[]>('/jobs');
        // return response.data;
        console.warn("Using mock API for getAll Jobs");
        return [];
    },
    create: async (data: Partial<Job>) => {
        // const response = await apiClient.post<Job>('/jobs', data);
        // return response.data;
        console.warn("Using mock API for create Job", data);
        return { id: "mock-id", ...data };
    }
};

export default apiClient;
