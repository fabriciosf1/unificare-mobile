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
  status: 'taken' | 'pending' | 'missed' | 'late';
  is_late: boolean;
}

export interface Medication {
  uuid: string;
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  schedule_times: string[];
  today_adherence: 'taken' | 'pending' | 'missed' | 'late';
  today_doses: MedicationDose[];
  approval_status?: 'approved' | 'pending' | 'rejected';
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

export interface FamilyContact {
  uuid: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  relationship: string | null;
  password_must_change?: boolean;
  patient: {
    id: number; // uso interno (canal Reverb camera.{id}) — não usar em URLs
    uuid: string;
    name: string;
    photo_url: string | null;
    age?: number | null;
    threshold?: {
      home_lat: number | null;
      home_lng: number | null;
      safe_radius_m: number;
    };
  };
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

export interface ExamResult {
  uuid: string;
  exam_type: string;
  exam_date: string;
  observations: string | null;
  file_name: string | null;
  source: 'staff' | 'patient' | 'family';
  created_at: string;
}
