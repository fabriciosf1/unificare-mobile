export interface Patient {
  uuid: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  threshold?: Record<string, unknown>;
}

export interface VitalSign {
  id: number;
  heart_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  created_at: string;
}

export interface Medication {
  uuid: string;
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  schedule_times: string[];
  today_adherence: 'taken' | 'pending' | 'missed' | 'late';
}

export interface AlertEvent {
  uuid: string;
  type: string;
  severity: 'attention' | 'critical';
  status: string;
  description: string | null;
  created_at: string;
}
