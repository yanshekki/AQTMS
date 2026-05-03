// ── Axios Instance with Zod Response Guard ──
// All API responses are validated through Zod schemas.
// Never trust the backend — always safeParse.

import axios from 'axios';
import type { ZodSchema } from 'zod';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT token ──
axiosInstance.interceptors.request.use((config) => {
  const authRaw = localStorage.getItem('aqtms_auth');
  if (authRaw) {
    try {
      const auth = JSON.parse(authRaw) as { state?: { token?: string } };
      const token = auth?.state?.token ?? (authRaw.includes('"token"') ? (JSON.parse(authRaw) as { token: string }).token : null);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// ── Response interceptor: global error handling ──
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aqtms_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Zod-guarded GET ──
export async function safeGet<T>(
  url: string,
  schema: ZodSchema<T>,
): Promise<T> {
  const response = await axiosInstance.get<unknown>(url);
  const result = schema.safeParse(response.data);
  if (!result.success) {
    console.error('API response validation failed:', result.error.issues);
    throw new Error('Data format error — backend returned unexpected shape');
  }
  return result.data;
}

// ── Zod-guarded POST ──
export async function safePost<T>(
  url: string,
  body: unknown,
  schema: ZodSchema<T>,
): Promise<T> {
  const response = await axiosInstance.post<unknown>(url, body);
  const result = schema.safeParse(response.data);
  if (!result.success) {
    console.error('API response validation failed:', result.error.issues);
    throw new Error('Data format error — backend returned unexpected shape');
  }
  return result.data;
}

// ── Zod-guarded PUT ──
export async function safePut<T>(
  url: string,
  body: unknown,
  schema: ZodSchema<T>,
): Promise<T> {
  const response = await axiosInstance.put<unknown>(url, body);
  const result = schema.safeParse(response.data);
  if (!result.success) {
    console.error('API response validation failed:', result.error.issues);
    throw new Error('Data format error — backend returned unexpected shape');
  }
  return result.data;
}

// ── Zod-guarded DELETE ──
export async function safeDelete<T>(
  url: string,
  body: unknown,
  schema: ZodSchema<T>,
): Promise<T> {
  const response = await axiosInstance.delete<unknown>(url, { data: body });
  const result = schema.safeParse(response.data);
  if (!result.success) {
    console.error('API response validation failed:', result.error.issues);
    throw new Error('Data format error — backend returned unexpected shape');
  }
  return result.data;
}
