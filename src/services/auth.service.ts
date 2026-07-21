import { api, setToken, clearToken } from './api';
import type { Patient } from '../types';

interface LoginResponse {
  token: string;
  patient: Patient;
}

export async function login(login_: string, password: string): Promise<Patient> {
  const { token, patient } = await api.post<LoginResponse>('/patient-auth/login', {
    login: login_,
    password,
  });
  await setToken(token);
  return patient;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/me/logout');
  } finally {
    await clearToken();
  }
}

export function me(): Promise<Patient> {
  return api.get<Patient>('/me');
}
