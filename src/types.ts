export interface Patient {
  id: number; // uso interno (canal Reverb camera.{id}) — não usar em URLs
  uuid: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  password_must_change?: boolean;
  threshold?: Record<string, unknown>;
  phone: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  reference_point: string | null;
}

export interface VitalSign {
  id: number;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  gps_lat: string | null;
  gps_lng: string | null;
  created_at: string;
}

export interface MedicationDose {
  time: string; // 'HH:MM'
  scheduled_at: string;
  // refused / out_of_stock: registrados pela Alexa (Iteração 2) — sem botão "Tomei" nesses estados
  status: 'taken' | 'pending' | 'missed' | 'late' | 'refused' | 'out_of_stock';
  is_late: boolean;
}

export interface Medication {
  uuid: string;
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  type: 'continuous' | 'period';
  identifier_color?: string | null;
  identifier_number?: number | null;
  start_date?: string;
  end_date?: string | null;
  schedule_times: string[];
  weekdays?: number[] | null;
  today_adherence: 'taken' | 'pending' | 'missed' | 'late' | 'refused' | 'out_of_stock';
  // 'awaiting_restock' = paciente avisou pela Alexa que acabou; a equipe libera pelo painel web
  stock_status?: 'ok' | 'awaiting_restock';
  today_doses: MedicationDose[];
  approval_status?: 'approved' | 'pending' | 'rejected';
  notes?: string | null;
}

export interface Appointment {
  uuid: string;
  appointment_date: string;
  appointment_time: string;
  type: string;
  professional: string | null;
  location: string | null;
  status: string;
  approval_status: 'approved' | 'pending' | 'rejected';
  notes: string | null;
  // Iteração 4 F1 — falado pela Alexa na véspera/dia
  preparation_instructions?: string | null;
  companion_contact_id?: number | null;
  attendance_status?: 'pending' | 'confirmed' | 'not_going';
  attendance_confirmed_by?: 'alexa' | 'family' | 'staff' | null;
  companion?: { id: number; uuid: string; name: string } | null;
}

export interface PatientContact {
  id: number;
  uuid: string;
  patient_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  is_primary: boolean;
}

export interface FamilyPatient {
  id: number; // uso interno (canal Reverb camera.{id}) — não usar em URLs
  uuid: string;
  name: string;
  photo_url: string | null;
  age?: number | null;
  relationship: string | null;
  is_primary: boolean;
  threshold?: {
    home_lat: number | null;
    home_lng: number | null;
    safe_radius_m: number;
  };
}

export interface FamilyContact {
  uuid: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  password_must_change?: boolean;
  patients: FamilyPatient[];
}

export interface PendingApprovals {
  medications: Medication[];
  appointments: Appointment[];
  geofence?: {
    pending_home_lat: number | null;
    pending_home_lng: number | null;
    pending_safe_radius_m: number | null;
  } | null;
}

export interface AlertEvent {
  uuid: string;
  type: string;
  severity: 'attention' | 'critical';
  status: string;
  description: string | null;
  created_at: string;
}

// Iteração 3 Alexa (F1): recado família/equipe ↔ paciente
export interface AlexaMessage {
  id: number;
  uuid: string;
  author_type: 'contact' | 'user' | 'patient';
  author_name: string;
  direction: 'to_patient' | 'from_patient';
  recipient_contact?: { id: number; uuid: string; name: string } | null;
  body: string;
  status: 'draft' | 'sent';
  read_at: string | null;
  delivered_via: 'voice' | 'app' | 'web' | null;
  is_alert: boolean;
  created_at: string;
}

// Iteração 3 Alexa (F2): linha do tempo — check-ins + sintomas/medições ditos por voz
export type HealthSeverity = 'normal' | 'attention' | 'critical';

export interface TimelineHealthEvent {
  type: 'health_event';
  id: number;
  uuid: string;
  at: string;
  kind: 'symptom' | 'measurement';
  subtype: string;
  label: string;
  value: number | null;
  value_secondary: number | null;
  unit: string | null;
  raw_text: string | null;
  source: string;
  severity: HealthSeverity;
  confirmation_pending: boolean;
  alert: { uuid: string; status: string; severity: string; type: string } | null;
}

export interface TimelineCheckIn {
  type: 'checkin';
  id: number;
  uuid: string;
  at: string;
  status: string;
  channel: string;
  notes: string | null;
  transcript: string | null;
  escalated: boolean;
}

export type TimelineItem = TimelineHealthEvent | TimelineCheckIn;

export interface ExamResult {
  uuid: string;
  exam_type: string;
  exam_date: string;
  observations: string | null;
  file_name: string | null;
  source: 'staff' | 'patient' | 'family';
  created_at: string;
}
