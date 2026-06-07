import React, { useState, useEffect, useMemo } from "react";
import { calculateDose } from "../utils/doseCalculator";
import type { Medicine } from "../utils/doseCalculator";
import { MedicineSelector } from "../components/MedicineSelector";
import { PrescriptionPreview } from "../components/PrescriptionPreview";
import type { SelectedMedicineInstance } from "../components/PrescriptionPreview";
import { LatinLegend } from "../components/LatinLegend";
import { PrescriptionHistory } from "../components/PrescriptionHistory";
import { InvestigationSelector } from "../components/InvestigationSelector";
import type { SavedPrescription } from "../components/PrescriptionHistory";

// Layout pagination imports
import { useMeasuredHeights } from "../hooks/useMeasuredHeights";
import { paginatePrescriptionContent } from "../utils/paginatePrescriptionContent";

import {
  A4_WIDTH_PX,
  PAGE_PADDING_PX,
  A4_HEIGHT_PX,
  HEADER_HEIGHT_PX,
  PATIENT_HEIGHT_PX,
  BOTTOM_HEIGHT_PX,
  CONTENT_VPAD_PX
} from "../utils/prescriptionConstants";

import { visitService } from "../services/visitService";
import type { WaitingVisitDetail } from "../services/visitService";
import { prescriptionService } from "../services/prescriptionService";
import { patientService } from "../services/patientService";
import { vitalService } from "../services/vitalService";
import type { Patient } from "../types/patient";

// Helper to format date as "DD MMM YYYY"
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Generates the Rx number
const generateRxNumber = (): string => {
  return `MHC-${String(Date.now()).slice(-6)}`;
};

interface DoctorPageProps {
  availableMedicines: Medicine[];
  onPrintTrigger: (data: {
    rxNumber: string;
    currentDateStr: string;
    patientName: string;
    patientAge: string;
    patientWeight: number | null;
    doctorName: string;
    prescriptionPages: any[];
    advice: string;
    followUp: string;
    investigations: string[];
    patientGender?: string;
    patientPhone?: string;
    patientCode?: string;
  }) => void;
}

export const DoctorPage: React.FC<DoctorPageProps> = ({
  availableMedicines,
  onPrintTrigger
}) => {
  // Queue list state
  const [waitingVisits, setWaitingVisits] = useState<WaitingVisitDetail[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<WaitingVisitDetail | null>(null);

  // Active consultation states
  const [rxNumber, setRxNumber] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientWeight, setPatientWeight] = useState<number | null>(null);
  const [doctorName, setDoctorName] = useState<string>(() => {
    return localStorage.getItem("mhc_default_doctor_name") || "Faisal";
  });
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicineInstance[]>([]);
  const [commonDuration, setCommonDuration] = useState<string>("5 days");
  const [advice, setAdvice] = useState<string>("");
  const [followUp, setFollowUp] = useState<string>("");
  const [investigations, setInvestigations] = useState<string[]>([]);
  const [patientHistory, setPatientHistory] = useState<SavedPrescription[]>([]);
  const [patientGender, setPatientGender] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientCode, setPatientCode] = useState<string>("");

  // UI state
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Add Patient Modal state
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Patient details state
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [ageYears, setAgeYears] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");
  const [height, setHeight] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");

  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);

  const [collapsedSections, setCollapsedSections] = useState({
    patientDetails: false,
    medicineSelector: false,
    selectedMeds: false,
    investigations: false,
    adviceFollowUp: false,
    history: false
  });

  const [recentCompletedVisits, setRecentCompletedVisits] = useState<WaitingVisitDetail[]>([]);

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openAndScrollToSection = (sectionId: string, sectionKey: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [sectionKey]: false }));
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  const loadRecentCompleted = async () => {
    try {
      const data = await visitService.getRecentCompletedVisits();
      setRecentCompletedVisits(data);
    } catch (err) {
      console.error("Failed to load recent completed visits:", err);
    }
  };

  const currentDateStr = useMemo(() => formatDate(new Date()), []);

  // Fetch waiting list
  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const data = await visitService.getWaitingVisits();
      setWaitingVisits(data);
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  const handleModalSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setFormMessage({ type: "error", text: "Please enter a name, phone, or patient code to search" });
      return;
    }

    setIsSearching(true);
    setFormMessage(null);
    try {
      const results = await patientService.searchPatients(query);
      setSearchResults(results);
      setShowSuggestions(true);
      if (results.length === 1) {
        selectModalPatient(results[0]);
        setFormMessage({ type: "success", text: "Patient found! Details loaded." });
      } else if (results.length > 1) {
        setFormMessage({ type: "success", text: `Found ${results.length} matching patients. Please select one.` });
      } else {
        setExistingPatient(null);
        const isNum = /^\d+$/.test(query);
        setName(isNum ? "" : query);
        setPhone(isNum ? query : "");
        setPrimaryContactPhone("");
        setGender("");
        setDob("");
        setAgeYears("");
        setFormMessage({ type: "success", text: "No matching patient found. Fill in details to register." });
      }
    } catch (err: any) {
      console.error(err);
      setFormMessage({ type: "error", text: "Failed to search patient. Check connection." });
    } finally {
      setIsSearching(false);
    }
  };

  const selectModalPatient = async (patient: Patient) => {
    setExistingPatient(patient);
    setName(patient.name);
    setDob(patient.date_of_birth || "");
    setAgeYears(patient.age_years || "");
    setGender(patient.gender || "");
    setPhone(patient.phone || "");
    setPrimaryContactPhone(patient.primary_contact_phone || "");
    setShowSuggestions(false);

    try {
      const latestVitals = await vitalService.getLatestVitalsForPatient(patient.id);
      if (latestVitals) {
        setHeight(latestVitals.height_cm || "");
        setWeight(latestVitals.weight_kg || "");
      } else {
        setHeight("");
        setWeight("");
      }
    } catch (err) {
      console.error("Failed to fetch latest vitals for selected patient:", err);
    }
  };

  const handleClearAddPatientForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSuggestions(false);
    setName("");
    setGender("");
    setDob("");
    setAgeYears("");
    setPhone("");
    setPrimaryContactPhone("");
    setHeight("");
    setWeight("");
    setExistingPatient(null);
    setFormMessage(null);
  };

  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanDob = dob.trim();

    if (!cleanName || weight === "") {
      setFormMessage({ type: "error", text: "Name and Weight are required" });
      return;
    }

    setIsSubmitting(true);
    setFormMessage(null);

    try {
      let patientId = existingPatient?.id;

      // 1. Create or update patient
      if (existingPatient) {
        await patientService.updatePatient(existingPatient.id, {
          name: cleanName,
          phone: phone.trim() || null,
          primary_contact_phone: primaryContactPhone.trim() || null,
          date_of_birth: cleanDob || null,
          age_years: ageYears !== "" ? Number(ageYears) : null,
          gender: gender || null
        });
        patientId = existingPatient.id;
      } else {
        const newPatient = await patientService.createPatient({
          name: cleanName,
          phone: phone.trim() || null,
          primary_contact_phone: primaryContactPhone.trim() || null,
          date_of_birth: cleanDob || null,
          age_years: ageYears !== "" ? Number(ageYears) : null,
          gender: gender || null
        });
        patientId = newPatient.id;
      }

      // 2. Create visit
      const visit = await visitService.createVisit({
        patient_id: patientId,
        status: "waiting"
      });

      // 3. Create vitals
      await vitalService.createVital({
        visit_id: visit.id,
        height_cm: height === "" ? null : height,
        weight_kg: weight
      });

      setFormMessage({ type: "success", text: `Success! ${cleanName} added to the queue.` });

      // Reload queue
      await loadQueue();

      // Close modal and clear form after a short delay
      setTimeout(() => {
        setIsAddPatientOpen(false);
        handleClearAddPatientForm();
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setFormMessage({ type: "error", text: `Failed to add patient to queue: ${err.message || err}` });
    } finally {
      setIsSubmitting(false);
    }
  };





  // Real-time queue subscription
  useEffect(() => {
    loadQueue();
    loadRecentCompleted();
    const unsubscribe = visitService.subscribeToWaitingVisits(() => {
      loadQueue();
      loadRecentCompleted();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Sync default doctor name to local storage
  useEffect(() => {
    localStorage.setItem("mhc_default_doctor_name", doctorName);
  }, [doctorName]);

  // Load patient details when a visit is selected
  const handleSelectVisit = async (visit: WaitingVisitDetail) => {
    setSelectedVisit(visit);
    setRxNumber(generateRxNumber());

    // Fetch fresh patient and vitals data to prevent stale state / race conditions
    let freshPatient = visit.patient;
    let freshVitals = visit.vitals;
    try {
      const [patientData, vitalsData] = await Promise.all([
        patientService.getPatientById(visit.patient_id),
        vitalService.getVitalsForVisit(visit.id)
      ]);
      if (patientData) {
        freshPatient = patientData;
      }
      if (vitalsData) {
        freshVitals = [vitalsData];
      }
    } catch (err) {
      console.error("Error fetching fresh patient/vitals details:", err);
    }

    setPatientName(freshPatient.name);
    setPatientGender(freshPatient.gender || "");
    setPatientPhone(freshPatient.phone || "");
    setPatientCode(freshPatient.patient_code || "");
    setSelectedMedicines([]);
    setCommonDuration("5 days");
    setAdvice("");
    setFollowUp("");
    setInvestigations([]);

    // Calculate age string from patient DOB or fallback to age_years
    let ageStr = "";
    if (freshPatient.date_of_birth) {
      const dob = new Date(freshPatient.date_of_birth);
      const today = new Date();
      let years = today.getFullYear() - dob.getFullYear();
      let months = today.getMonth() - dob.getMonth();
      if (months < 0 || (months === 0 && today.getDate() < dob.getDate())) {
        years--;
        months += 12;
      }
      ageStr = years > 0
        ? `${years} year${years > 1 ? "s" : ""}${months > 0 ? ` ${months} month${months > 1 ? "s" : ""}` : ""}`
        : `${months} month${months > 1 ? "s" : ""}`;
    } else if (freshPatient.age_years !== undefined && freshPatient.age_years !== null) {
      ageStr = `${freshPatient.age_years} year${freshPatient.age_years > 1 ? "s" : ""}`;
    } else {
      ageStr = "N/A";
    }
    setPatientAge(ageStr);

    // Set weight
    const vital = freshVitals?.[0];
    setPatientWeight(vital?.weight_kg || null);

    // If the visit is completed, load its prescription
    if (visit.status === "completed") {
      try {
        const rx = await prescriptionService.getPrescriptionByVisitId(visit.id);
        if (rx) {
          setRxNumber(rx.rx_number);
          setSelectedMedicines(
            (rx.items || []).map((item) => ({
              id: item.id,
              name: item.medicine_name,
              form: item.medicine_form || "",
              strength: item.medicine_strength || "",
              dosePerKg: item.dose_per_kg || null,
              unit: item.unit || "mg",
              maxDose: null,
              frequency: (item.frequency as any) || "BD",
              duration: item.duration,
              overrideDose: item.override_dose || null,
              instructions: item.instructions
            }))
          );
          setAdvice(rx.notes || "");
          setFollowUp(rx.follow_up || "");
          setInvestigations(rx.investigations || []);
        }
      } catch (err) {
        console.error("Failed to load completed visit prescription:", err);
      }
    }

    // Fetch patient's previous prescriptions history
    try {
      const history = await prescriptionService.getPrescriptionHistoryForPatient(visit.patient_id);
      const mapped = history.map((rx) => {
        const visitDate = rx.created_at ? new Date(rx.created_at) : new Date();
        return {
          rxNumber: rx.rx_number,
          date: formatDate(visitDate),
          patientName: visit.patient.name,
          patientAge: ageStr,
          patientWeight: vital?.weight_kg || null,
          patientGender: visit.patient.gender || "",
          patientPhone: visit.patient.phone || "",
          patientCode: visit.patient.patient_code || "",
          doctorName: rx.doctor_name,
          selectedMedicines: (rx.items || []).map((item) => ({
            id: item.id,
            name: item.medicine_name,
            form: item.medicine_form || "",
            strength: item.medicine_strength || "",
            dosePerKg: item.dose_per_kg || null,
            unit: item.unit || "mg",
            maxDose: null,
            frequency: (item.frequency as any) || "BD",
            duration: item.duration,
            overrideDose: item.override_dose || null,
            instructions: item.instructions
          })),
          advice: rx.notes,
          followUp: rx.follow_up,
          investigations: (rx as any).investigations || []
        };
      });
      setPatientHistory(mapped);
    } catch (err) {
      console.error("Failed to load patient history:", err);
      setPatientHistory([]);
    }
  };

  // Measure dynamic heights
  const { medicineHeights, adviceHeight, followUpHeight, investigationsHeight, isMeasuring } = useMeasuredHeights(
    selectedMedicines,
    advice,
    followUp,
    investigations,
    A4_WIDTH_PX - PAGE_PADDING_PX * 2,
    patientWeight
  );

  // Content budget calculation (fixed — header, footer, and page bottom always shown)
  const contentBudgetPx = useMemo(() => {
    return A4_HEIGHT_PX - HEADER_HEIGHT_PX - PATIENT_HEIGHT_PX - BOTTOM_HEIGHT_PX - CONTENT_VPAD_PX * 2;
  }, []);

  // Recalculate A4 page allocations
  const prescriptionPages = useMemo(() => {
    return paginatePrescriptionContent({
      medicines: selectedMedicines,
      medicineHeights,
      contentBudgetPx: contentBudgetPx,
      adviceHeight,
      followUpHeight,
      investigationsHeight
    });
  }, [selectedMedicines, medicineHeights, contentBudgetPx, adviceHeight, followUpHeight, investigationsHeight]);

  // Precalculate queue display data to keep JSX clean and declarative
  const queueItems = useMemo(() => {
    return waitingVisits.map((visit) => {
      const isSelected = selectedVisit?.id === visit.id;
      const nameInitials = visit.patient.name
        .split(" ")
        .map((n) => n[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2);

      return {
        visit,
        isSelected,
        nameInitials
      };
    });
  }, [waitingVisits, selectedVisit]);

  // Add medicine
  const handleSelectMedicine = (med: Medicine) => {
    const newInstance: SelectedMedicineInstance = {
      id: `${med.name}-${Date.now()}`,
      name: med.name,
      form: med.form,
      strength: med.strength,
      dosePerKg: med.dosePerKg,
      unit: med.unit,
      maxDose: med.maxDose,
      frequency: "BD",
      duration: commonDuration,
      overrideDose: null,
      instructions: "After meals"
    };
    setSelectedMedicines((prev) => [...prev, newInstance]);
  };

  // Update common duration for all current medicines
  const handleCommonDurationChange = (val: string) => {
    setCommonDuration(val);
    setSelectedMedicines((prev) =>
      prev.map((m) => ({ ...m, duration: val }))
    );
  };

  // Remove medicine
  const handleRemoveMedicine = (id: string) => {
    setSelectedMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  // Update specific fields of a selected medicine
  const handleUpdateMedicine = (id: string, updates: Partial<SelectedMedicineInstance>) => {
    setSelectedMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  // Clear inputs
  const handleClearAll = () => {
    const confirmClear = window.confirm("Are you sure you want to clear the current consultation?");
    if (confirmClear) {
      setSelectedMedicines([]);
      setCommonDuration("5 days");
      setAdvice("");
      setFollowUp("");
      setInvestigations([]);
      setRxNumber(generateRxNumber());
    }
  };

  // Save & Print
  const handlePrint = async () => {
    if (!selectedVisit) return;
    if (selectedMedicines.length === 0) {
      alert("Please add at least one medication to prescribe.");
      return;
    }

    setErrorMsg("");

    try {
      // Trigger print callback only
      onPrintTrigger({
        rxNumber,
        currentDateStr,
        patientName,
        patientAge,
        patientWeight,
        doctorName,
        prescriptionPages,
        advice,
        followUp,
        investigations,
        patientGender,
        patientPhone,
        patientCode
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to print prescription: ${err.message || err}`);
    }
  };

  // Save & Complete (without printing)
  const handleComplete = async () => {
    if (!selectedVisit) return;
    setErrorMsg("");

    try {
      const hasMedicines = selectedMedicines.length > 0;
      const hasAdvice = advice.trim() !== "";
      const hasInvestigations = investigations.length > 0;

      if (hasMedicines || hasAdvice || hasInvestigations) {
        // 1. Prepare Prescription Payload
        const rxPayload = {
          visit_id: selectedVisit.id,
          notes: advice,
          doctor_name: doctorName,
          follow_up: followUp,
          rx_number: rxNumber
        };

        // 2. Prepare Items
        const itemsPayload = selectedMedicines.map((med) => {
          const calculated = calculateDose(med, patientWeight, med.overrideDose);
          return {
            medicine_name: med.name,
            dosage: calculated.doseText,
            duration: med.duration,
            instructions: med.instructions,
            frequency: med.frequency,
            medicine_form: med.form,
            medicine_strength: med.strength,
            override_dose: med.overrideDose,
            dose_per_kg: med.dosePerKg,
            unit: med.unit
          };
        });

        // 3. Save to Supabase
        await prescriptionService.createPrescription(rxPayload, itemsPayload, investigations);
      }

      // 4. Update status to completed
      await visitService.updateVisitStatus(selectedVisit.id, "completed");

      // Clear consultation and deselect patient
      setSelectedVisit(null);
      setSelectedMedicines([]);
      setAdvice("");
      setFollowUp("");
      setInvestigations([]);
      loadQueue();
      loadRecentCompleted();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to complete consultation: ${err.message || err}`);
    }
  };

  const handleLoadPrescription = (rx: SavedPrescription) => {
    setRxNumber(generateRxNumber()); // Generate a new Rx number, but load medications & advice
    setSelectedMedicines(
      rx.selectedMedicines.map((m) => ({
        ...m,
        id: `${m.name}-${Date.now()}` // generate fresh instance IDs
      }))
    );
    setAdvice(rx.advice);
    setFollowUp(rx.followUp);
    setInvestigations(rx.investigations || []);
    setPatientGender((rx as any).patientGender || "");
    setPatientPhone((rx as any).patientPhone || "");
    setPatientCode((rx as any).patientCode || "");
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  return (
    <div>
      {/* Waiting List Bar */}
      <div className="medical-card" style={{ marginBottom: "28px" }}>
        <div className="card-header" style={{ padding: "16px 24px" }}>
          <div className="card-header-icon bg-light-primary text-primary" style={{ width: "30px", height: "30px" }}>
            <span className="live-dot" style={{ backgroundColor: "var(--primary)", width: "8px", height: "8px", borderRadius: "50%", display: "inline-block", animation: "pulse-live 1.8s infinite" }}></span>
          </div>
          <div className="card-header-titles">
            <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Active Waiting Queue ({waitingVisits.length})</h4>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={loadQueue}
              disabled={isLoadingQueue}
            >
              {isLoadingQueue ? "Refreshing..." : "Refresh Queue"}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setIsAddPatientOpen(true)}
              style={{ backgroundColor: "var(--primary)", border: "none" }}
            >
              + Add Patient
            </button>
          </div>
        </div>
        <div className="card-body" style={{ padding: "16px 24px" }}>
          {waitingVisits.length === 0 ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--muted)" }}>
              No patients waiting in queue. Add patients using the Receptionist view.
            </div>
          ) : (
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "6px" }}>
              {queueItems.map(({ visit, isSelected, nameInitials }) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => handleSelectVisit(visit)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 16px",
                    backgroundColor: isSelected ? "var(--primary)" : "var(--white)",
                    color: isSelected ? "var(--white)" : "var(--navy)",
                    border: `1px solid ${isSelected ? "var(--primary-dark)" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    textAlign: "left",
                    minWidth: "200px",
                    transition: "var(--transition)",
                    boxShadow: isSelected ? "var(--shadow-md)" : "none"
                  }}
                >
                  <div style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    backgroundColor: isSelected ? "rgba(255, 255, 255, 0.2)" : "var(--primary-light)",
                    color: isSelected ? "var(--white)" : "var(--primary-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "12px"
                  }}>
                    {nameInitials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{visit.patient.name}</div>
                    <div style={{ fontSize: "11px", opacity: 0.85 }}>
                      {visit.vitals?.[0]?.weight_kg ? `${visit.vitals[0].weight_kg} kg` : "No weight"} &middot; {visit.patient.phone}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Patients (Last 5 Completed) Bar */}
      {recentCompletedVisits.length > 0 && (
        <div className="medical-card" style={{ marginBottom: "28px", backgroundColor: "#fbfcfc" }}>
          <div className="card-header" style={{ padding: "12px 24px" }}>
            <div className="card-header-icon bg-light-primary text-primary" style={{ width: "30px", height: "30px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div className="card-header-titles">
              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Recently Completed Patients (Last 5)</h4>
            </div>
          </div>
          <div className="card-body" style={{ padding: "16px 24px" }}>
            <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "6px" }}>
              {recentCompletedVisits.map((visit) => {
                const nameInitials = visit.patient.name
                  .split(" ")
                  .map((n) => n[0] || "")
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <button
                    key={visit.id}
                    type="button"
                    onClick={() => handleSelectVisit(visit)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 16px",
                      backgroundColor: "var(--white)",
                      color: "var(--navy)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textAlign: "left",
                      minWidth: "200px",
                      transition: "var(--transition)",
                    }}
                  >
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(10, 124, 107, 0.08)",
                      color: "var(--primary-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "12px"
                    }}>
                      {nameInitials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{visit.patient.name}</div>
                      <div style={{ fontSize: "11px", opacity: 0.85 }}>
                        {visit.vitals?.[0]?.weight_kg ? `${visit.vitals[0].weight_kg} kg` : "No weight"} &middot; {visit.patient.phone}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Workspace Split Layout */}
      {selectedVisit ? (
        <div className="workspace-container" style={{ padding: 0 }}>
          <div className="left-panel">
            {errorMsg && (
              <div style={{ padding: "12px", background: "var(--danger-light)", border: "1px solid #f8b4b4", color: "var(--danger)", borderRadius: "var(--radius-sm)", fontSize: "14px" }}>
                {errorMsg}
              </div>
            )}

            {/* Quick Section Navigation Bar */}
            <div style={{
              display: "flex",
              gap: "8px",
              marginBottom: "20px",
              padding: "10px",
              backgroundColor: "var(--page-bg)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              overflowX: "auto",
              position: "sticky",
              top: "94px",
              zIndex: 10
            }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => openAndScrollToSection("section-patient-details", "patientDetails")}
                style={{ whiteSpace: "nowrap" }}
              >
                Patient Details
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => openAndScrollToSection("section-medicine-selector", "medicineSelector")}
                style={{ whiteSpace: "nowrap" }}
              >
                Medicine Catalog
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => openAndScrollToSection("section-selected-meds", "selectedMeds")}
                style={{ whiteSpace: "nowrap" }}
              >
                Selected Rx
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => openAndScrollToSection("section-investigations", "investigations")}
                style={{ whiteSpace: "nowrap" }}
              >
                Investigations
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => openAndScrollToSection("section-advice-followup", "adviceFollowUp")}
                style={{ whiteSpace: "nowrap" }}
              >
                Advice & Follow-up
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => openAndScrollToSection("section-history", "history")}
                style={{ whiteSpace: "nowrap" }}
              >
                History
              </button>
            </div>

            {/* Active Patient Details */}
            <div className="medical-card" id="section-patient-details">
              <div 
                className="card-header" 
                style={{ cursor: "pointer" }}
                onClick={() => toggleSection("patientDetails")}
              >
                <div className="card-header-icon bg-light-primary text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="card-header-titles">
                  <h3 className="card-title">Consulting: {patientName}</h3>
                  <p className="card-subtitle">Age: {patientAge} &middot; Weight: {patientWeight} kg</p>
                </div>
                <button 
                  type="button" 
                  className="btn btn-success btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleComplete();
                  }}
                  style={{ marginRight: "10px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "4px", display: "inline-block", verticalAlign: "middle" }}>
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Complete Consultation
                </button>
                <button 
                  type="button" 
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)" }}
                  aria-label={collapsedSections.patientDetails ? "Expand" : "Collapse"}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    style={{ transform: collapsedSections.patientDetails ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              {!collapsedSections.patientDetails && (
                <div className="card-body" style={{ padding: "16px 24px" }}>
                  <div className="form-grid">
                    <div className="form-group col-span-12">
                      <label htmlFor="doctor-input" className="form-label">Consulting Doctor</label>
                      <div className="doctor-input-wrapper">
                        <span className="dr-prefix">Dr.</span>
                        <input
                          id="doctor-input"
                          type="text"
                          className="form-control doctor-input"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Medicine Selector */}
            <MedicineSelector
              availableMedicines={availableMedicines}
              selectedMedicines={selectedMedicines}
              onSelectMedicine={handleSelectMedicine}
              isCollapsed={collapsedSections.medicineSelector}
              onToggleCollapse={() => toggleSection("medicineSelector")}
            />

            {/* Selected Medications */}
            <div className="medical-card" id="section-selected-meds">
              <div 
                className="card-header" 
                style={{ cursor: "pointer" }}
                onClick={() => toggleSection("selectedMeds")}
              >
                <div className="card-header-icon bg-light-primary text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div className="card-header-titles">
                  <h3 className="card-title">Selected Medications</h3>
                  <p className="card-subtitle">Adjust dosages, override values, and specify frequency</p>
                </div>
                <button 
                  type="button" 
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)" }}
                  aria-label={collapsedSections.selectedMeds ? "Expand" : "Collapse"}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    style={{ transform: collapsedSections.selectedMeds ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              {!collapsedSections.selectedMeds && (
                <div className="card-body">
                  <div className="form-group" style={{ marginBottom: "20px", maxWidth: "320px" }}>
                    <label className="form-label font-medium" style={{ fontSize: "13px", color: "var(--navy)" }}>Default Duration for All Medications</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g., 5 days"
                      value={commonDuration}
                      onChange={(e) => handleCommonDurationChange(e.target.value)}
                    />
                  </div>
                  {selectedMedicines.length > 0 ? (
                    <div className="selected-meds-list">
                      {selectedMedicines.map((med, index) => {
                        const calculated = calculateDose(med, patientWeight, med.overrideDose);
                        return (
                          <div key={med.id} className="selected-med-card">
                            <div className="selected-med-card-header">
                              <div className="selected-med-meta">
                                <span className="med-index-number">{index + 1}</span>
                                <div className="med-title-group">
                                  <h4 className="med-card-name">{med.name}</h4>
                                  <span className="med-card-spec">
                                    {med.form} &middot; {med.strength} &middot; {med.dosePerKg !== null ? `${med.dosePerKg} mg/kg` : "Fixed Dose"}
                                  </span>
                                </div>
                              </div>
                              <div className="selected-med-header-right">
                                <span className={`badge dose-indicator-badge ${med.overrideDose ? "override-active" : "calculated-active"}`}>
                                  {calculated.doseText}
                                </span>
                                <button
                                  type="button"
                                  className="btn-remove-med"
                                  onClick={() => handleRemoveMedicine(med.id)}
                                >
                                  &times;
                                </button>
                              </div>
                            </div>

                            <div className="selected-med-card-body">
                              <div className="form-group">
                                <label className="form-label mini-label">Frequency (Sig)</label>
                                <div className="frequency-segmented-control">
                                  {(["OD", "BD", "TDS", "HS", "SOS"] as const).map((freq) => (
                                    <button
                                      key={freq}
                                      type="button"
                                      className={`frequency-pill-btn ${med.frequency === freq ? "active" : ""}`}
                                      onClick={() => handleUpdateMedicine(med.id, { frequency: freq })}
                                    >
                                      <span className="freq-code">{freq}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="med-inputs-row">
                                <div className="form-group flex-1">
                                  <label className="form-label mini-label">Duration</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={med.duration}
                                    onChange={(e) => handleUpdateMedicine(med.id, { duration: e.target.value })}
                                  />
                                </div>

                                <div className="form-group flex-1">
                                  <label className="form-label mini-label">Override Dose ({med.unit})</label>
                                  <div className="override-input-wrapper">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      className="form-control form-control-sm"
                                      placeholder="Auto"
                                      value={med.overrideDose === null ? "" : med.overrideDose}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const parsed = val === "" ? null : parseFloat(val);
                                        handleUpdateMedicine(med.id, { overrideDose: parsed });
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label mini-label">Special Instructions</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={med.instructions}
                                  onChange={(e) => handleUpdateMedicine(med.id, { instructions: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p className="empty-state-text">No medications selected yet</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Investigations */}
            <InvestigationSelector
              selectedInvestigations={investigations}
              onToggleInvestigation={(name) => {
                setInvestigations((prev) =>
                  prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
                );
              }}
              onAddCustomInvestigation={(name) => {
                setInvestigations((prev) => [...prev, name]);
              }}
              isCollapsed={collapsedSections.investigations}
              onToggleCollapse={() => toggleSection("investigations")}
            />

            {/* Advice & Follow-up */}
            <div className="medical-card" id="section-advice-followup">
              <div 
                className="card-header" 
                style={{ cursor: "pointer" }}
                onClick={() => toggleSection("adviceFollowUp")}
              >
                <div className="card-header-icon bg-light-primary text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <div className="card-header-titles">
                  <h3 className="card-title">Advice & Follow-up</h3>
                </div>
                <button 
                  type="button" 
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)" }}
                  aria-label={collapsedSections.adviceFollowUp ? "Expand" : "Collapse"}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    style={{ transform: collapsedSections.adviceFollowUp ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              {!collapsedSections.adviceFollowUp && (
                <div className="card-body">
                  <div className="form-grid">
                    <div className="form-group col-span-12">
                      <label htmlFor="advice" className="form-label">Advice / Remarks</label>
                      <textarea
                        id="advice"
                        className="form-control"
                        rows={3}
                        value={advice}
                        onChange={(e) => setAdvice(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="form-group col-span-12">
                      <label htmlFor="followup" className="form-label">Follow-up Timing</label>
                      <input
                        id="followup"
                        type="text"
                        className="form-control"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <LatinLegend />

            <div className="medical-card" id="section-history">
              <div 
                className="card-header" 
                style={{ cursor: "pointer" }}
                onClick={() => toggleSection("history")}
              >
                <div className="card-header-icon bg-light-primary text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div className="card-header-titles">
                  <h3 className="card-title">Recent Prescriptions ({patientHistory.length})</h3>
                  <p className="card-subtitle">Quickly reload or manage local patient records</p>
                </div>
                <button 
                  type="button" 
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)" }}
                  aria-label={collapsedSections.history ? "Expand" : "Collapse"}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5"
                    style={{ transform: collapsedSections.history ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              {!collapsedSections.history && (
                <div className="card-body" style={{ padding: 0 }}>
                  <PrescriptionHistory
                    history={patientHistory.slice(0, 5)}
                    onLoad={handleLoadPrescription}
                    onDelete={() => { }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sticky Live Preview */}
          <div className="right-panel">
            <PrescriptionPreview
              rxNumber={rxNumber}
              currentDate={currentDateStr}
              patientName={patientName}
              patientAge={patientAge}
              patientWeight={patientWeight}
              doctorName={doctorName}
              patientGender={patientGender}
              patientPhone={patientPhone}
              patientCode={patientCode}
              selectedMedicines={selectedMedicines}
              advice={advice}
              followUp={followUp}
              investigations={investigations}
              onClearAll={handleClearAll}
              onPrint={handlePrint}
              pages={prescriptionPages}
              isMeasuring={isMeasuring}
            />
          </div>
        </div>
      ) : (
        <div className="medical-card" style={{ padding: "40px", textAlign: "center" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--muted)", marginBottom: "16px" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <h4 style={{ fontSize: "16px", fontWeight: 600, color: "var(--navy)", marginBottom: "8px" }}>No Patient Selected</h4>
          <p style={{ color: "var(--muted)", maxWidth: "300px", margin: "0 auto", fontSize: "13px" }}>
            Please select a patient from the waiting queue bar above to start writing their prescription.
          </p>
        </div>
      )}

      {/* Add Patient Modal */}
      {isAddPatientOpen && (
        <div className="modal-backdrop">
          <div className="modal-container" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <div className="modal-header-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--primary)" }}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <h3>Add Patient to Queue</h3>
              </div>
              <button className="modal-close-btn" onClick={() => { setIsAddPatientOpen(false); handleClearAddPatientForm(); }} aria-label="Close modal">
                &times;
              </button>
            </div>
            <div className="modal-body">
              {formMessage && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "20px",
                    backgroundColor: formMessage.type === "success" ? "rgba(10, 124, 107, 0.08)" : "var(--danger-light)",
                    border: `1px solid ${formMessage.type === "success" ? "var(--primary-border)" : "#f8b4b4"}`,
                    color: formMessage.type === "success" ? "var(--primary-dark)" : "var(--danger)",
                    fontSize: "14px"
                  }}
                >
                  {formMessage.text}
                </div>
              )}

              <form onSubmit={handleAddPatientSubmit} className="form-grid">
                {/* Patient Search Row */}
                <div className="form-group col-span-12" style={{ position: "relative", marginBottom: "16px" }}>
                  <label htmlFor="modal-patient-search-query" className="form-label">Search Patient</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <input
                      id="modal-patient-search-query"
                      type="text"
                      className="form-control"
                      placeholder="Enter name, phone, or patient code..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (showSuggestions) setShowSuggestions(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleModalSearch();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ height: "42px", padding: "0 20px", whiteSpace: "nowrap" }}
                      onClick={handleModalSearch}
                      disabled={isSearching || !searchQuery.trim()}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && searchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "var(--white)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        boxShadow: "var(--shadow-lg)",
                        zIndex: 100,
                        maxHeight: "220px",
                        overflowY: "auto",
                        marginTop: "5px"
                      }}
                    >
                      {searchResults.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => selectModalPatient(p)}
                          style={{
                            padding: "10px 15px",
                            borderBottom: "1px solid var(--page-bg)",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                          className="suggestion-item"
                        >
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--navy)" }}>{p.name}</div>
                            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                              Code: {p.patient_code} &middot; Phone: {p.phone || p.primary_contact_phone || "N/A"}
                            </div>
                          </div>
                          {p.gender && (
                            <span className="badge" style={{ backgroundColor: "rgba(10, 124, 107, 0.08)", color: "var(--primary-dark)", border: "1px solid var(--primary-border)" }}>
                              {p.gender}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Patient Banner */}
                {existingPatient && (
                  <div className="form-group col-span-12 patient-selected-banner">
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--primary-dark)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Selected Existing Patient</span>
                      <h4 style={{ margin: 0, color: "var(--navy)", fontWeight: 700 }}>{existingPatient.name} ({existingPatient.patient_code})</h4>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearAddPatientForm}
                      style={{ height: "32px", padding: "0 12px" }}
                    >
                      Deselect / Clear
                    </button>
                  </div>
                )}
                                 {/* Child's Name */}
                <div className="form-group col-span-8">
                  <label htmlFor="modal-patient-name" className="form-label required-label">Child's Full Name</label>
                  <input
                    id="modal-patient-name"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Gender */}
                <div className="form-group col-span-4">
                  <label htmlFor="modal-patient-gender" className="form-label">Gender</label>
                  <select
                    id="modal-patient-gender"
                    className="form-control"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ height: "42px" }}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Age Info */}
                <div className="form-group col-span-12">
                  <label htmlFor="modal-patient-age" className="form-label">Age (Years)</label>
                  <input
                    id="modal-patient-age"
                    type="number"
                    min="0"
                    className="form-control"
                    value={ageYears}
                    onChange={(e) => setAgeYears(e.target.value === "" ? "" : parseInt(e.target.value))}
                    placeholder="Enter age in years"
                  />
                </div>

                {/* Phone Fields */}
                <div className="form-group col-span-6">
                  <label htmlFor="modal-patient-phone-field" className="form-label">Patient's Phone</label>
                  <input
                    id="modal-patient-phone-field"
                    type="number"
                    className="form-control"
                    placeholder="Patient phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group col-span-6">
                  <label htmlFor="modal-patient-primary-contact" className="form-label">Primary Contact/Guardian Name</label>
                  <input
                    id="modal-patient-primary-contact"
                    type="text"
                    className="form-control"
                    placeholder="Parent/Guardian name"
                    value={primaryContactPhone}
                    onChange={(e) => setPrimaryContactPhone(e.target.value)}
                  />
                </div>

                {/* Height */}
                <div className="form-group col-span-6">
                  <label htmlFor="modal-patient-height" className="form-label">Height (cm)</label>
                  <input
                    id="modal-patient-height"
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 95.2"
                    value={height}
                    onChange={(e) => setHeight(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  />
                </div>

                {/* Weight */}
                <div className="form-group col-span-6">
                  <label htmlFor="modal-patient-weight" className="form-label required-label">Weight (kg)</label>
                  <input
                    id="modal-patient-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 14.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    required
                  />
                </div>

                {/* Actions */}
                <div className="form-group col-span-12 form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "10px 24px" }}
                    onClick={handleClearAddPatientForm}
                    disabled={isSubmitting}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: "10px 28px" }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Enqueuing..." : "Add to Waiting List"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
