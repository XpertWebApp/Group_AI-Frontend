import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type { ApiError } from '@/types';

// Allow callers to opt-out of the global error toast (e.g. when the UI
// already shows the error inline).
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _suppressToast?: boolean;
  }
  interface AxiosRequestConfig {
    _suppressToast?: boolean;
  }
}

/** Map HTTP status codes to a friendly fallback message. */
function statusToMessage(status: number | undefined): string {
  switch (status) {
    case 400: return 'The request contained invalid data. Please check your inputs and try again.';
    case 403: return 'You do not have permission to perform this action.';
    case 404: return 'The requested resource could not be found.';
    case 409: return 'This action conflicts with the current state of the data. Please refresh and try again.';
    case 412: return 'This action cannot be performed because the offer is not in the correct state.';
    case 422: return 'The submitted data failed validation. Please review your inputs.';
    case 429: return 'Too many requests. Please wait a moment before trying again.';
    case 500: return 'An unexpected server error occurred. Please try again or contact support.';
    case 502:
    case 503:
    case 504: return 'The server is temporarily unavailable. Please try again in a moment.';
    default:  return 'An unexpected error occurred. Please try again.';
  }
}

const baseURL =
  typeof window !== 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
    : undefined;

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: ApiError }>) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };
    const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginPage) {
      originalRequest._retry = true;
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      if (refreshToken) {
        try {
          const { data } = await axios.post<{ data: { accessToken: string } }>(
            `${baseURL}/auth/refresh`,
            { refreshToken },
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          const newToken = data?.data?.accessToken;
          if (newToken && typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newToken);
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          }
        } catch {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
        }
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    // Show toast for API errors (skip 401s which are handled above, and
    // skip requests that opted out via _suppressToast).
    if (typeof window !== 'undefined' && error.response?.status !== 401 && !originalRequest._suppressToast) {
      // The backend sends { success, error: "ERROR_CODE", message: "...", data: {} }
      // `data.message` is the human-readable message; `data.error` is the machine code (a string).
      const backendMessage = (error.response?.data as Record<string, unknown>)?.message as string | undefined;
      const message = backendMessage || statusToMessage(error.response?.status);
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

export function getApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error as ApiError;
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: 'An unexpected error occurred' };
}
