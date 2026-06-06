import { supabase } from "../supabase/client";
import type { Prescription, PrescriptionItem } from "../types/prescription";
import type { Medicine } from "../utils/doseCalculator";
import { MEDICINE_DATASET } from "../utils/doseCalculator";

export type PrescriptionWithDetails = Prescription & {
  items: PrescriptionItem[];
  patientName: string;
  patientAge: string;
  patientWeight: number | null;
};

export const prescriptionService = {
  async createPrescription(
    prescription: Omit<Prescription, "id">,
    items: Omit<PrescriptionItem, "id" | "prescription_id">[],
    investigations: string[] = []
  ): Promise<Prescription> {
    if (!supabase) throw new Error("Supabase is not configured");

    // 1. Insert prescription
    const { data: rxData, error: rxError } = await supabase
      .from("prescriptions")
      .insert([prescription])
      .select()
      .single();

    if (rxError) {
      console.error("Error creating prescription:", rxError);
      throw rxError;
    }

    const prescriptionId = rxData.id;

    // 2. Insert items in bulk
    const itemsToInsert = items.map((item) => ({
      ...item,
      prescription_id: prescriptionId
    }));

    const { error: itemsError } = await supabase
      .from("prescription_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error creating prescription items:", itemsError);
      // Clean up orphaned prescription if items fail to save
      await supabase.from("prescriptions").delete().eq("id", prescriptionId);
      throw itemsError;
    }

    // 3. Insert investigations (if any)
    if (investigations.length > 0) {
      const investigationsToInsert = investigations.map((name) => ({
        prescription_id: prescriptionId,
        name
      }));
      const { error: invError } = await supabase
        .from("prescription_investigations")
        .insert(investigationsToInsert);
      if (invError) {
        console.error("Error saving investigations (non-fatal):", invError);
      }
    }

    return rxData;
  },

  async getPrescriptionHistoryForPatient(patientId: string): Promise<(Prescription & { items: PrescriptionItem[]; investigations: string[] })[]> {
    if (!supabase) throw new Error("Supabase is not configured");

    // Get prescriptions via visits table for this patient, including investigations
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*, items:prescription_items(*), investigation_items:prescription_investigations(*), visit:visits!inner(patient_id)")
      .eq("visit.patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prescriptions for patient:", error);
      throw error;
    }

    return (data || []).map((rx: any) => ({
      ...rx,
      investigations: (rx.investigation_items || []).map((inv: any) => inv.name)
    }));
  },

  async getAllPrescriptionsHistory(): Promise<PrescriptionWithDetails[]> {
    if (!supabase) throw new Error("Supabase is not configured");

    // Get all prescriptions with patient name and vitals for historical listing
    const { data, error } = await supabase
      .from("prescriptions")
      .select(`
        *,
        items:prescription_items(*),
        visit:visits(
          id,
          patient:patients(*),
          vitals(*)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all prescriptions history:", error);
      throw error;
    }

    return (data || []).map((rx: any) => {
      const patient = rx.visit?.patient;
      const vital = rx.visit?.vitals?.[0];
      
      // Calculate age string from patient's dob
      let ageStr = "";
      if (patient?.date_of_birth) {
        const dob = new Date(patient.date_of_birth);
        const today = new Date(rx.created_at || new Date());
        let years = today.getFullYear() - dob.getFullYear();
        let months = today.getMonth() - dob.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
          years--;
          months += 12;
        }
        ageStr = years > 0 
          ? `${years} year${years > 1 ? "s" : ""}${months > 0 ? ` ${months} month${months > 1 ? "s" : ""}` : ""}`
          : `${months} month${months > 1 ? "s" : ""}`;
      }

      return {
        id: rx.id,
        visit_id: rx.visit_id,
        notes: rx.notes || "",
        doctor_name: rx.doctor_name || "",
        follow_up: rx.follow_up || "",
        rx_number: rx.rx_number || "",
        created_at: rx.created_at,
        items: rx.items || [],
        patientName: patient?.name || "Unknown",
        patientAge: ageStr,
        patientWeight: vital?.weight_kg || null
      };
    });
  },

  // --- Medicine Catalog Methods (replacing Google Sheets) ---
  async getMedicinesCatalog(): Promise<Medicine[]> {
    if (!supabase) {
      // Fallback if not configured
      return MEDICINE_DATASET;
    }

    const { data, error } = await supabase
      .from("medicines")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching medicines catalog:", error);
      return MEDICINE_DATASET;
    }

    if (!data || data.length === 0) {
      // Catalog is empty, populate with defaults
      await this.restoreCatalogDefaults();
      return MEDICINE_DATASET;
    }

    // Map DB structure back to Medicine type
    return data.map((item: any) => ({
      name: item.name,
      form: item.form,
      strength: item.strength,
      dosePerKg: item.dose_per_kg,
      unit: item.unit,
      maxDose: item.max_dose
    }));
  },

  async addMedicineToCatalog(med: Medicine): Promise<boolean> {
    if (!supabase) return false;

    const dbItem = {
      name: med.name,
      form: med.form,
      strength: med.strength,
      dose_per_kg: med.dosePerKg,
      unit: med.unit,
      max_dose: med.maxDose
    };

    const { error } = await supabase
      .from("medicines")
      .upsert([dbItem], { onConflict: "name,form,strength" });

    if (error) {
      console.error("Error adding medicine to catalog:", error);
      return false;
    }
    return true;
  },

  async deleteMedicineFromCatalog(name: string, form: string, strength: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from("medicines")
      .delete()
      .eq("name", name)
      .eq("form", form)
      .eq("strength", strength);

    if (error) {
      console.error("Error deleting medicine from catalog:", error);
      return false;
    }
    return true;
  },

  async restoreCatalogDefaults(): Promise<boolean> {
    if (!supabase) return false;

    const dbItems = MEDICINE_DATASET.map((med) => ({
      name: med.name,
      form: med.form,
      strength: med.strength,
      dose_per_kg: med.dosePerKg,
      unit: med.unit,
      max_dose: med.maxDose
    }));

    const { error } = await supabase
      .from("medicines")
      .upsert(dbItems, { onConflict: "name,form,strength" });

    if (error) {
      console.error("Error restoring default medicines catalog:", error);
      return false;
    }
    return true;
  }
};
