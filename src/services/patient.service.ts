import { api } from './api';
import type { AlertEvent, Appointment, ExamResult, Medication, PatientContact, VitalSign } from '../types';

export interface Drug {
  id: number;
  uuid: string;
  name: string;
  dosages: string[];
}

export function getDrugCatalog(): Promise<Drug[]> {
  return api.get<Drug[]>('/me/drugs');
}

export function getLatestVital(): Promise<VitalSign | null> {
  return api.get<VitalSign | null>('/me/vitals/latest');
}

export function getTodayMedications(): Promise<Medication[]> {
  return api.get<Medication[]>('/me/medications/today');
}

export function logMedication(medicationId: number, scheduledAt: string): Promise<void> {
  return api.post('/me/medications/' + medicationId + '/log', {
    status: 'taken',
    scheduled_at: scheduledAt,
    taken_at: new Date().toISOString(),
  });
}

export function getMyAlerts(): Promise<{ data: AlertEvent[] }> {
  return api.get<{ data: AlertEvent[] }>('/me/alerts');
}

export function getMyContacts(): Promise<PatientContact[]> {
  return api.get<PatientContact[]>('/me/contacts');
}

export function triggerSos(): Promise<AlertEvent> {
  return api.post<AlertEvent>('/me/alerts/sos');
}

export function sendCheckIn(status: 'ok' | 'attention' | 'no_response', notes?: string): Promise<void> {
  return api.post('/me/checkins', { status, notes });
}

export function registerPushToken(expoPushToken: string, platform: string): Promise<void> {
  return api.post('/me/push/subscribe', { expo_push_token: expoPushToken, platform });
}

export interface NewMedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  schedule_times: string[];
  start_date: string;
  notes?: string;
}

export function requestMedication(data: NewMedicationInput): Promise<Medication> {
  return api.post<Medication>('/me/medications', data);
}

export interface NewAppointmentInput {
  appointment_date: string;
  appointment_time: string;
  type: 'consulta' | 'exame' | 'retorno' | 'outro';
  professional?: string;
  location?: string;
  notes?: string;
}

export function requestAppointment(data: NewAppointmentInput): Promise<Appointment> {
  return api.post<Appointment>('/me/appointments', data);
}

export function sendGpsPing(lat: number, lng: number): Promise<void> {
  return api.post('/me/locations', { gps_lat: String(lat), gps_lng: String(lng) });
}

export function setMyGeofence(lat: number, lng: number, safeRadiusM?: number): Promise<void> {
  return api.put('/me/geofence', { gps_lat: lat, gps_lng: lng, safe_radius_m: safeRadiusM });
}

export interface ProfileInput {
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference_point?: string;
}

export function updateMyProfile(data: ProfileInput): Promise<void> {
  return api.put('/me/profile', data);
}

export function updateMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.put('/me/password', {
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  });
}

export function uploadMyPhoto(uri: string): Promise<{ photo_url: string }> {
  const formData = new FormData();
  formData.append('photo', {
    uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  return api.upload<{ photo_url: string }>('/me/photo', formData);
}

export interface NewExamInput {
  exam_type: string;
  exam_date: string;
  observations?: string;
  file: { uri: string; name: string; mimeType: string };
}

export function uploadMyExam(data: NewExamInput): Promise<void> {
  const formData = new FormData();
  formData.append('exam_type', data.exam_type);
  formData.append('exam_date', data.exam_date);
  if (data.observations) formData.append('observations', data.observations);
  formData.append('file', {
    uri: data.file.uri,
    name: data.file.name,
    type: data.file.mimeType,
  } as unknown as Blob);
  return api.upload('/me/exams', formData);
}

export function getMyExams(): Promise<ExamResult[]> {
  return api.get<ExamResult[]>('/me/exams');
}

export function openMyExam(exam: ExamResult): Promise<void> {
  return api.downloadAndOpen(`/me/exams/${exam.uuid}/view`, exam.file_name ?? `${exam.exam_type}.jpg`);
}
