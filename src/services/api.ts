import * as SecureStore from 'expo-secure-store';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'uc_patient_token';
const ROLE_KEY = 'uc_app_role';
const REQUEST_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 30000;

export type AppRole = 'patient' | 'family';

// Sem isso, um fetch numa rede que "engole" pacotes (portal cativo, firewall
// que dropa em vez de recusar, proxy com TLS quebrado) nunca resolve nem
// rejeita — trava a Promise pra sempre (ex.: loading infinito no login).
function withTimeout(ms: number = REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: withTimeout(),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado. Verifique sua internet.');
    }
    throw err;
  }

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      signal: withTimeout(),
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado. Verifique sua internet.');
    }
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// RN Nova Arquitetura (Expo SDK 52+/RN 0.74+) quebrou o atalho clássico
// formData.append('x', { uri, name, type }) para arquivos — lança
// "Unsupported FormDataPart implementation". Convertendo para Blob real
// via fetch(uri) antes de anexar funciona nas duas arquiteturas.
async function appendFilePart(
  formData: FormData,
  fieldName: string,
  file: { uri: string; name: string; mimeType: string },
): Promise<void> {
  const response = await fetch(file.uri);
  const blob = await response.blob();
  formData.append(fieldName, blob, file.name);
}

async function downloadAndOpen(path: string, fileName: string): Promise<void> {
  const token = await getToken();
  const destination = new File(Paths.cache, fileName);

  const task = File.createDownloadTask(`${API_BASE_URL}${path}`, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: withTimeout(DOWNLOAD_TIMEOUT_MS),
  });

  let file: File | null;
  try {
    file = await task.downloadAsync();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tempo de conexão esgotado. Verifique sua internet.');
    }
    throw err;
  }

  if (!file) {
    throw new Error('Não foi possível baixar o arquivo.');
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => upload<T>(path, formData),
  appendFilePart,
  downloadAndOpen,
};
