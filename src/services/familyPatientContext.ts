import * as SecureStore from 'expo-secure-store';

const ACTIVE_PATIENT_KEY = 'uc_family_active_patient_uuid';

// Cache em memória — o interceptor do api.ts (sync) não pode esperar o SecureStore
// a cada requisição, então loadActivePatient() precisa rodar 1x no boot/login antes
// de qualquer chamada a rota /family/* que dependa do header X-Patient-Uuid.
let activePatientUuid: string | null = null;

export async function loadActivePatient(): Promise<string | null> {
  activePatientUuid = await SecureStore.getItemAsync(ACTIVE_PATIENT_KEY);
  return activePatientUuid;
}

export function getActivePatientUuid(): string | null {
  return activePatientUuid;
}

export async function setActivePatientUuid(uuid: string): Promise<void> {
  activePatientUuid = uuid;
  await SecureStore.setItemAsync(ACTIVE_PATIENT_KEY, uuid);
}

export async function clearActivePatient(): Promise<void> {
  activePatientUuid = null;
  await SecureStore.deleteItemAsync(ACTIVE_PATIENT_KEY);
}
