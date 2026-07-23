import { api } from './api';
import type { AlertEvent, Appointment, ExamResult, FamilyContact, Medication, PendingApprovals, VitalSign } from '../types';
import type { Drug } from './patient.service';

export function familyMe(): Promise<FamilyContact> {
  return api.get<FamilyContact>('/family/me');
}

export function familyUpdatePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.put('/family/password', {
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPassword,
  });
}

export interface FamilyProfileInput {
  name: string;
  phone?: string;
  email?: string;
}

export function familyUpdateProfile(data: FamilyProfileInput): Promise<void> {
  return api.put('/family/profile', data);
}

export function getPendingApprovals(): Promise<PendingApprovals> {
  return api.get<PendingApprovals>('/family/pending');
}

export function approveMedication(uuid: string): Promise<void> {
  return api.post(`/family/medications/${uuid}/approve`);
}

export function rejectMedication(uuid: string): Promise<void> {
  return api.post(`/family/medications/${uuid}/reject`);
}

export function approveAppointment(uuid: string): Promise<void> {
  return api.post(`/family/appointments/${uuid}/approve`);
}

export function rejectAppointment(uuid: string): Promise<void> {
  return api.post(`/family/appointments/${uuid}/reject`);
}

export function approveGeofence(): Promise<void> {
  return api.post('/family/geofence/approve');
}

export function rejectGeofence(): Promise<void> {
  return api.post('/family/geofence/reject');
}

interface LatestLocationResponse {
  location: VitalSign | null;
  threshold: {
    home_lat: number | null;
    home_lng: number | null;
    safe_radius_m: number;
    pending_home_lat?: number | null;
    pending_home_lng?: number | null;
    pending_safe_radius_m?: number | null;
    geofence_approval_status?: string | null;
  } | null;
}

export function getLatestLocation(): Promise<LatestLocationResponse> {
  return api.get<LatestLocationResponse>('/family/patient/location/latest');
}

export function registerFamilyPushToken(expoPushToken: string, platform: string): Promise<void> {
  return api.post('/family/push/subscribe', { expo_push_token: expoPushToken, platform });
}

export function getFamilyAlerts(): Promise<{ data: AlertEvent[] }> {
  return api.get<{ data: AlertEvent[] }>('/family/alerts');
}

export function getFamilyMedicationsToday(): Promise<Medication[]> {
  return api.get<Medication[]>('/family/medications/today');
}

export function logFamilyMedication(medicationUuid: string, scheduledAt: string): Promise<void> {
  return api.post(`/family/medications/${medicationUuid}/log`, {
    status: 'taken',
    scheduled_at: scheduledAt,
    taken_at: new Date().toISOString(),
  });
}

export function requestCamera(): Promise<void> {
  return api.post('/family/camera/request');
}

export function getFamilyDrugCatalog(): Promise<Drug[]> {
  return api.get<Drug[]>('/family/drugs');
}

export interface NewMedicationInput {
  name: string;
  dosage: string;
  frequency: string;
  schedule_times: string[];
  start_date: string;
  notes?: string;
}

export function createFamilyMedication(data: NewMedicationInput): Promise<Medication> {
  return api.post<Medication>('/family/medications', data);
}

export interface NewAppointmentInput {
  appointment_date: string;
  appointment_time: string;
  type: 'consulta' | 'exame' | 'retorno' | 'outro';
  professional?: string;
  location?: string;
  notes?: string;
}

export function createFamilyAppointment(data: NewAppointmentInput): Promise<Appointment> {
  return api.post<Appointment>('/family/appointments', data);
}

export interface NewExamInput {
  exam_type: string;
  exam_date: string;
  observations?: string;
  file: { uri: string; name: string; mimeType: string };
}

export function uploadFamilyExam(data: NewExamInput): Promise<void> {
  const formData = new FormData();
  formData.append('exam_type', data.exam_type);
  formData.append('exam_date', data.exam_date);
  if (data.observations) formData.append('observations', data.observations);
  formData.append('file', {
    uri: data.file.uri,
    name: data.file.name,
    type: data.file.mimeType,
  } as unknown as Blob);
  return api.upload('/family/exams', formData);
}

export function getFamilyExams(): Promise<ExamResult[]> {
  return api.get<ExamResult[]>('/family/exams');
}

export function openFamilyExam(exam: ExamResult): Promise<void> {
  return api.downloadAndOpen(`/family/exams/${exam.uuid}/view`, exam.file_name ?? `${exam.exam_type}.jpg`);
}
