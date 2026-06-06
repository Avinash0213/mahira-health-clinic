export type VisitStatus = "waiting" | "in_consultation" | "completed";

export interface Visit {
  id: string;
  patient_id: string;
  status: VisitStatus;
  created_at?: string;
}
