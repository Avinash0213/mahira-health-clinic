import { supabase } from "../supabase/client";
import type { Visit, VisitStatus } from "../types/visit";
import type { Patient } from "../types/patient";
import type { Vital } from "../types/vital";

export type WaitingVisitDetail = Visit & {
  patient: Patient;
  vitals: Vital[];
};

export const visitService = {
  async createVisit(visit: Omit<Visit, "id">): Promise<Visit> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("visits")
      .insert([visit])
      .select()
      .single();

    if (error) {
      console.error("Error creating visit:", error);
      throw error;
    }

    return data;
  },

  async updateVisitStatus(visitId: string, status: VisitStatus): Promise<void> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { error } = await supabase
      .from("visits")
      .update({ status })
      .eq("id", visitId);

    if (error) {
      console.error("Error updating visit status:", error);
      throw error;
    }
  },

  async getWaitingVisits(): Promise<WaitingVisitDetail[]> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("visits")
      .select("*, patient:patients(*), vitals(*)")
      .eq("status", "waiting")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching waiting visits:", error);
      throw error;
    }

    return (data || []) as WaitingVisitDetail[];
  },

  subscribeToWaitingVisits(onChange: () => void): () => void {
    if (!supabase) {
      return () => {};
    }

    const channel = supabase
      .channel("waiting_visits_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visits" },
        () => {
          onChange();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vitals" },
        () => {
          onChange();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "patients" },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },

  async getRecentCompletedVisits(): Promise<WaitingVisitDetail[]> {
    if (!supabase) throw new Error("Supabase is not configured");

    const { data, error } = await supabase
      .from("visits")
      .select("*, patient:patients(*), vitals(*)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching completed visits:", error);
      throw error;
    }

    return (data || []) as WaitingVisitDetail[];
  }
};
