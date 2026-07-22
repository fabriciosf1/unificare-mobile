import { api } from './api';
import type { FamilyContact, PendingApprovals, VitalSign } from '../types';

export function familyMe(): Promise<FamilyContact> {
  return api.get<FamilyContact>('/family/me');
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
