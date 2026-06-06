export interface Patient {
  id: string;
  patient_code: string;
  name: string;
  date_of_birth?: string | null; // ISO format (YYYY-MM-DD)
  age_years?: number | null;
  gender?: string | null;
  phone?: string | null;
  primary_contact_phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

