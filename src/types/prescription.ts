export interface Prescription {
  id: string;
  visit_id: string;
  notes: string;
  doctor_name: string;
  follow_up: string;
  rx_number: string;
  created_at?: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  duration: string;
  instructions: string;
  frequency?: string;
  medicine_form?: string;
  medicine_strength?: string;
  override_dose?: number | null;
  dose_per_kg?: number | null;
  unit?: string;
  created_at?: string;
}

export interface PrescriptionInvestigation {
  id: string;
  prescription_id: string;
  name: string;
  created_at?: string;
}
