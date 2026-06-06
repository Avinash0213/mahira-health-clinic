import { supabase } from "../supabase/client";
import type { Patient } from "../types/patient";

export const patientService = {
  async searchPatientByPhone(phone: string): Promise<Patient | null> {
    if (!supabase) throw new Error("Supabase is not configured");

    const cleanPhone = phone.trim();
    if (!cleanPhone) return null;

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .or(`phone.eq.${cleanPhone},primary_contact_phone.eq.${cleanPhone}`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error searching patient by phone:", error);
      throw error;
    }

    return data;
  },

  async searchPatients(query: string): Promise<Patient[]> {
    if (!supabase) throw new Error("Supabase is not configured");

    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    // Search by name, phone, primary_contact_phone, or patient_code
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .or(`name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%,primary_contact_phone.ilike.%${cleanQuery}%,patient_code.ilike.%${cleanQuery}%`)
      .order("name", { ascending: true })
      .limit(15);

    if (error) {
      console.error("Error searching patients:", error);
      throw error;
    }

    return data || [];
  },

  async createPatient(patient: Omit<Patient, "id" | "patient_code"> & { patient_code?: string }): Promise<Patient> {
    if (!supabase) throw new Error("Supabase is not configured");

    const newPatient: any = {
      name: patient.name.trim(),
      date_of_birth: patient.date_of_birth || null,
      age_years: patient.age_years || null,
      gender: patient.gender || null,
      phone: patient.phone && patient.phone.trim() ? patient.phone.trim() : "0000000000",
      primary_contact_phone: patient.primary_contact_phone ? patient.primary_contact_phone.trim() : null
    };

    if (patient.patient_code) {
      newPatient.patient_code = patient.patient_code.trim();
    }

    // Attempt insert
    const { data, error } = await supabase
      .from("patients")
      .insert([newPatient])
      .select()
      .single();

    if (error) {
      if (error.code === "23505" && newPatient.patient_code) {
        // Fallback search to return existing patient if collision on code
        const { data: existing } = await supabase
          .from("patients")
          .select("*")
          .eq("patient_code", newPatient.patient_code)
          .maybeSingle();
        if (existing) return existing;
      }
      console.error("Error creating patient:", error);
      throw error;
    }

    return data;
  },

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    if (!supabase) throw new Error("Supabase is not configured");

    const cleanUpdates: any = { ...updates };
    if (updates.name) cleanUpdates.name = updates.name.trim();
    if (updates.phone !== undefined) {
      cleanUpdates.phone = updates.phone && updates.phone.trim() ? updates.phone.trim() : "0000000000";
    }
    if (updates.primary_contact_phone !== undefined) {
      cleanUpdates.primary_contact_phone = updates.primary_contact_phone ? updates.primary_contact_phone.trim() : null;
    }

    const { data, error } = await supabase
      .from("patients")
      .update(cleanUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating patient:", error);
      throw error;
    }

    return data;
  },

  async getPatientById(id: string): Promise<Patient | null> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching patient by ID:", error);
      throw error;
    }

    return data;
  }
};

