import { api, setToken, setRole, clearToken } from './api';
import type { FamilyContact, Patient } from '../types';

interface LoginResponse {
  token: string;
  patient: Patient;
}

interface FamilyLoginResponse {
  token: string;
  contact: FamilyContact;
}

export async function login(login_: string, password: string): Promise<Patient> {
  const { token, patient } = await api.post<LoginResponse>('/patient-auth/login', {
    login: login_,
    password,
  });
  await setToken(token);
  await setRole('patient');
  return patient;
}

export async function familyLogin(login_: string, password: string): Promise<FamilyContact> {
  const { token, contact } = await api.post<FamilyLoginResponse>('/family-auth/login', {
    login: login_,
    password,
  });
  await setToken(token);
  await setRole('family');
  return contact;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/me/logout');
  } finally {
    await clearToken();
  }
}

export async function familyLogout(): Promise<void> {
  try {
    await api.post('/family/logout');
  } finally {
    await clearToken();
  }
}

export function me(): Promise<Patient> {
  return api.get<Patient>('/me');
}
