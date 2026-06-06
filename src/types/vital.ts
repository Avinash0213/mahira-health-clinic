export interface Vital {
  id: string;
  visit_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  recorded_at?: string;
}
