import { api } from './api';
import type { AlertEvent, Medication, VitalSign } from '../types';

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

export function triggerSos(): Promise<AlertEvent> {
  return api.post<AlertEvent>('/me/alerts/sos');
}

export function sendCheckIn(status: 'ok' | 'attention' | 'no_response', notes?: string): Promise<void> {
  return api.post('/me/checkins', { status, notes });
}

export function registerPushToken(expoPushToken: string, platform: string): Promise<void> {
  return api.post('/me/push/subscribe', { expo_push_token: expoPushToken, platform });
}
