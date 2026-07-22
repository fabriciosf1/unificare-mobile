import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'uc_patient_token';
const ROLE_KEY = 'uc_app_role';

export type AppRole = 'patient' | 'family';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
}

export async function getRole(): Promise<AppRole | null> {
  return (await SecureStore.getItemAsync(ROLE_KEY)) as AppRole | null;
}

export async function setRole(role: AppRole): Promise<void> {
  await SecureStore.setItemAsync(ROLE_KEY, role);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Erro ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

async function upload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
};
