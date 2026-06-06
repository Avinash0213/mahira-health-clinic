import { supabase } from "../supabase/client";
import type { Vital } from "../types/vital";

export const vitalService = {
  async createVital(vital: Omit<Vital, "id">): Promise<Vital> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("vitals")
      .insert([vital])
      .select()
      .single();

    if (error) {
      console.error("Error creating vitals record:", error);
      throw error;
    }

    return data;
  },

  async getVitalsForVisit(visitId: string): Promise<Vital | null> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("vitals")
      .select("*")
      .eq("visit_id", visitId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching vitals for visit:", error);
      throw error;
    }

    return data;
  },

  async getLatestVitalsForPatient(patientId: string): Promise<Vital | null> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("vitals")
      .select("*, visit:visits!inner(patient_id)")
      .eq("visit.patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching latest vitals for patient:", error);
      throw error;
    }

    return data;
  }
};
