import React, { useState, useEffect, useMemo } from "react";
import { calculateDose, MEDICINE_DATASET } from "./utils/doseCalculator";
import type { Medicine } from "./utils/doseCalculator";
import { MedicineSelector } from "./components/MedicineSelector";
import { PrescriptionPreview } from "./components/PrescriptionPreview";
import { MahiraLogo } from "./components/MahiraLogo";
import { SettingsModal } from "./components/SettingsModal";
import type { SelectedMedicineInstance } from "./components/PrescriptionPreview";
import { LatinLegend } from "./components/LatinLegend";
import { PrescriptionHistory } from "./components/PrescriptionHistory";
import type { SavedPrescription } from "./components/PrescriptionHistory";

// Layout pagination imports
import { useMeasuredHeights } from "./hooks/useMeasuredHeights";
import { paginatePrescriptionContent } from "./utils/paginatePrescriptionContent";
import { PrescriptionPage } from "./components/PrescriptionPage";
import { 
  A4_WIDTH_PX, 
  PAGE_PADDING_PX,
  A4_HEIGHT_PX,
  HEADER_HEIGHT_PX,
  PATIENT_HEIGHT_PX,
  BOTTOM_HEIGHT_PX,
  CONTENT_VPAD_PX
} from "./utils/prescriptionConstants";

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

export const App: React.FC = () => {
  // Core application states
  const [rxNumber, setRxNumber] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientWeight, setPatientWeight] = useState<number | null>(null);
  const [doctorName, setDoctorName] = useState<string>("");
  const [selectedMedicines, setSelectedMedicines] = useState<SelectedMedicineInstance[]>([]);
  const [advice, setAdvice] = useState<string>("");
  const [followUp, setFollowUp] = useState<string>("");
  const [savedHistory, setSavedHistory] = useState<SavedPrescription[]>([]);

  // Syncing states
  const DEFAULT_SHEETS_URL = "https://script.google.com/macros/s/AKfycbx2xKc6c0YNWKOIlBRlMveGtsVRk6sSRSB8hpX1XTfQud80TwbxCzyue9_gMq0e-Xozxw/exec";
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>(() => {
    const saved = localStorage.getItem("mhc_sheets_url");
    return saved !== null ? saved : DEFAULT_SHEETS_URL;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [syncMedicines, setSyncMedicines] = useState<Medicine[]>([]);
  const [customMedicines, setCustomMedicines] = useState<Medicine[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Print Customization States
  const [showHeader, setShowHeader] = useState<boolean>(() => {
    const saved = localStorage.getItem("mhc_show_header");
    return saved !== null ? saved === "true" : false; // Default to false (removed)
  });
  const [showFooter, setShowFooter] = useState<boolean>(() => {
    const saved = localStorage.getItem("mhc_show_footer");
    return saved !== null ? saved === "true" : false; // Default to false (removed)
  });
  const [keepLetterheadSpace, setKeepLetterheadSpace] = useState<boolean>(() => {
    const saved = localStorage.getItem("mhc_keep_letterhead_space");
    return saved !== null ? saved === "true" : true;
  });

  const handleShowHeaderChange = (val: boolean) => {
    setShowHeader(val);
    localStorage.setItem("mhc_show_header", String(val));
  };
  const handleShowFooterChange = (val: boolean) => {
    setShowFooter(val);
    localStorage.setItem("mhc_show_footer", String(val));
  };
  const handleKeepLetterheadSpaceChange = (val: boolean) => {
    setKeepLetterheadSpace(val);
    localStorage.setItem("mhc_keep_letterhead_space", String(val));
  };

  // Format once per session/render
  const currentDateStr = useMemo(() => formatDate(new Date()), []);

  // Measure dynamic medicine row and advice/followup heights off-screen
  const { medicineHeights, adviceHeight, followUpHeight, isMeasuring } = useMeasuredHeights(
    selectedMedicines,
    advice,
    followUp,
    A4_WIDTH_PX - PAGE_PADDING_PX * 2,
    patientWeight
  );

  // Calculate A4 content budget dynamically based on header/footer print configuration
  const contentBudgetPx = useMemo(() => {
    let headerHeight = HEADER_HEIGHT_PX;
    let bottomHeight = BOTTOM_HEIGHT_PX;

    if (!keepLetterheadSpace) {
      if (!showHeader) {
        headerHeight = 16; // Small margin top instead of the full header
      }
      if (!showFooter) {
        // Footer is 60px of the 160px bottom block
        bottomHeight = 100;
      }
    }

    return A4_HEIGHT_PX - headerHeight - PATIENT_HEIGHT_PX - bottomHeight - CONTENT_VPAD_PX * 2;
  }, [showHeader, showFooter, keepLetterheadSpace]);

  // Recalculate A4 page allocations whenever content or measured heights change
  const prescriptionPages = useMemo(() => {
    return paginatePrescriptionContent({
      medicines: selectedMedicines,
      medicineHeights,
      contentBudgetPx: contentBudgetPx,
      adviceHeight,
      followUpHeight
    });
  }, [selectedMedicines, medicineHeights, contentBudgetPx, adviceHeight, followUpHeight]);

  // Fetch medicines catalog from Sheets
  const fetchMedicinesFromSheets = async (url: string) => {
    try {
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      if (Array.isArray(data)) {
        setSyncMedicines(data);
      }
    } catch (err) {
      console.error("Failed to fetch medicines from Google Sheets", err);
    }
  };

  // Initialize Rx number, History, Sheets URL, and Custom medicines on load
  useEffect(() => {
    setRxNumber(generateRxNumber());

    const saved = localStorage.getItem("mhc_prescriptions");
    if (saved) {
      try {
        setSavedHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse saved prescriptions history", err);
      }
    }

    const savedUrl = localStorage.getItem("mhc_sheets_url");
    const url = savedUrl !== null ? savedUrl : DEFAULT_SHEETS_URL;
    setGoogleSheetsUrl(url);
    if (url) {
      fetchMedicinesFromSheets(url);
    }

    const storedCustom = localStorage.getItem("mhc_custom_medicines");
    if (storedCustom) {
      try {
        setCustomMedicines(JSON.parse(storedCustom));
      } catch (err) {
        console.error("Failed to parse custom medicines", err);
      }
    }
  }, []);

  const mergedMedicines = useMemo(() => {
    if (syncMedicines.length > 0) {
      return syncMedicines;
    }
    return [...MEDICINE_DATASET, ...customMedicines];
  }, [syncMedicines, customMedicines]);

  const handleSaveSheetsUrl = (url: string) => {
    setGoogleSheetsUrl(url);
    localStorage.setItem("mhc_sheets_url", url);
    if (url) {
      fetchMedicinesFromSheets(url);
    } else {
      setSyncMedicines([]);
    }
  };

  const handleAddMedicine = async (med: Medicine): Promise<boolean> => {
    if (googleSheetsUrl) {
      setIsSyncing(true);
      try {
        await fetch(googleSheetsUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "add_medicine",
            medicine: med
          })
        });
        await fetchMedicinesFromSheets(googleSheetsUrl);
        setIsSyncing(false);
        return true;
      } catch (err) {
        console.error("Failed to sync new medicine with Sheets", err);
        setIsSyncing(false);
        alert("Failed to sync new medicine with Google Sheets. Connecting locally instead.");
        return false;
      }
    } else {
      const updated = [...customMedicines, med];
      setCustomMedicines(updated);
      localStorage.setItem("mhc_custom_medicines", JSON.stringify(updated));
      return true;
    }
  };

  const handleDeleteMedicine = async (name: string, form: string, strength: string): Promise<boolean> => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${name} from the catalog?`);
    if (!confirmDelete) return false;

    if (googleSheetsUrl) {
      setIsSyncing(true);
      try {
        await fetch(googleSheetsUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "delete_medicine",
            medicineName: name,
            medicineForm: form,
            medicineStrength: strength
          })
        });
        await fetchMedicinesFromSheets(googleSheetsUrl);
        setIsSyncing(false);
        return true;
      } catch (err) {
        console.error("Failed to sync delete with Sheets", err);
        setIsSyncing(false);
        alert("Failed to sync deletion with Google Sheets.");
        return false;
      }
    } else {
      const updated = customMedicines.filter(
        (m) => !(m.name.toLowerCase() === name.toLowerCase() && 
                 m.form.toLowerCase() === form.toLowerCase() && 
                 m.strength.toLowerCase() === strength.toLowerCase())
      );
      setCustomMedicines(updated);
      localStorage.setItem("mhc_custom_medicines", JSON.stringify(updated));
      return true;
    }
  };

  const handleRestoreDefaults = async (): Promise<boolean> => {
    if (googleSheetsUrl) {
      setIsSyncing(true);
      try {
        await fetch(googleSheetsUrl, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "restore_defaults"
          })
        });
        await fetchMedicinesFromSheets(googleSheetsUrl);
        setIsSyncing(false);
        return true;
      } catch (err) {
        console.error("Failed to restore defaults with Sheets", err);
        setIsSyncing(false);
        alert("Failed to restore missing defaults on Google Sheets.");
        return false;
      }
    }
    return true;
  };


  // Add medicine to selection
  const handleSelectMedicine = (med: Medicine) => {
    const newInstance: SelectedMedicineInstance = {
      id: `${med.name}-${Date.now()}`,
      name: med.name,
      form: med.form,
      strength: med.strength,
      dosePerKg: med.dosePerKg,
      unit: med.unit,
      maxDose: med.maxDose,
      frequency: "BD", // Default to Twice Daily
      duration: "5 days", // Default duration
      overrideDose: null,
      instructions: "After meals" // Default instruction
    };
    setSelectedMedicines((prev) => [...prev, newInstance]);
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

  // Clear all fields after confirmation
  const handleClearAll = () => {
    const confirmClear = window.confirm("Are you sure you want to clear all inputs? This will reset the current prescription.");
    if (confirmClear) {
      setPatientName("");
      setPatientAge("");
      setPatientWeight(null);
      setSelectedMedicines([]);
      setAdvice("");
      setFollowUp("");
      setRxNumber(generateRxNumber());
    }
  };

  // Save current prescription to history and print
  const handlePrint = () => {
    if (selectedMedicines.length === 0) return;

    const newRx: SavedPrescription = {
      rxNumber,
      date: currentDateStr,
      patientName,
      patientAge,
      patientWeight,
      doctorName,
      selectedMedicines,
      advice,
      followUp
    };

    // Update history, avoiding duplicates of same Rx
    const updatedHistory = [newRx, ...savedHistory.filter((item) => item.rxNumber !== rxNumber)];
    setSavedHistory(updatedHistory);
    localStorage.setItem("mhc_prescriptions", JSON.stringify(updatedHistory));

    // Log to Google Sheets asynchronously if URL is configured
    if (googleSheetsUrl) {
      fetch(googleSheetsUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "log_prescription",
          ...newRx
        })
      }).catch(err => {
        console.error("Failed to log prescription to Google Sheets", err);
      });
    }

    // Wait short delay to ensure React commits state, then trigger print dialog
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Start a new patient session
  const handleNewPatient = () => {
    // Check if there is any data entered
    const hasData =
      patientName.trim() !== "" ||
      patientAge.trim() !== "" ||
      patientWeight !== null ||
      selectedMedicines.length > 0 ||
      advice.trim() !== "" ||
      followUp.trim() !== "";

    if (!hasData) return;

    // Check if the current prescription is already printed/saved in history
    const isSaved = savedHistory.some((item) => item.rxNumber === rxNumber);

    if (!isSaved) {
      const confirmNew = window.confirm(
        "You have not printed/saved the current prescription. Are you sure you want to discard it and create a new patient?"
      );
      if (!confirmNew) return;
    }

    setPatientName("");
    setPatientAge("");
    setPatientWeight(null);
    setSelectedMedicines([]);
    setAdvice("");
    setFollowUp("");
    setRxNumber(generateRxNumber());
  };

  // Load prescription from history
  const handleLoadPrescription = (rx: SavedPrescription) => {
    setRxNumber(rx.rxNumber);
    setPatientName(rx.patientName);
    setPatientAge(rx.patientAge);
    setPatientWeight(rx.patientWeight);
    setDoctorName(rx.doctorName);
    setSelectedMedicines(rx.selectedMedicines);
    setAdvice(rx.advice);
    setFollowUp(rx.followUp);

    // Scroll back to top so user can see it loaded
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete prescription from history
  const handleDeletePrescription = (num: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete prescription ${num}?`);
    if (confirmDelete) {
      const updated = savedHistory.filter((rx) => rx.rxNumber !== num);
      setSavedHistory(updated);
      localStorage.setItem("mhc_prescriptions", JSON.stringify(updated));
    }
  };

  return (
    <div className="app-container">
      {/* SCREEN ONLY UI */}
      <div className="screen-only">
        {/* Sticky Top Navigation */}
        <header className="top-navbar">
          <div className="nav-container">
            <div className="nav-left">
              <MahiraLogo size={42} style={{ marginRight: "4px" }} />
              <div className="clinic-branding">
                <div className="clinic-title-container">
                  <span className="clinic-brand-mahira">Mahira</span>
                  <div className="clinic-right-group">
                    <span className="clinic-brand-healthcare">Health Care</span>
                    <div className="clinic-underline-row">
                      <div className="clinic-line"></div>
                      <span className="clinic-tagline">We Care For You</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="nav-right" style={{ gap: "12px" }}>
              {googleSheetsUrl && (
                <span 
                  className={`sync-status-indicator ${syncMedicines.length > 0 ? "" : "offline"}`} 
                  title={syncMedicines.length > 0 ? "Synced with Google Sheets" : "Offline / Check Sheets URL"}
                >
                  <span 
                    className="live-dot" 
                    style={{ 
                      backgroundColor: syncMedicines.length > 0 ? "#10b981" : "#9ca3af",
                      animation: syncMedicines.length > 0 ? "pulse-live 1.8s infinite" : "none" 
                    }}
                  ></span>
                  {syncMedicines.length > 0 ? "Synced" : "Offline"}
                </span>
              )}
              <button 
                type="button" 
                className="btn-nav-settings" 
                onClick={() => setIsSettingsOpen(true)}
                title="Open Clinic Settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
              <div className="date-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{currentDateStr}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Workspace (Two-column layout) */}
        <main className="main-workspace">
          <div className="workspace-container">
            {/* Left Panel: Form */}
            <div className="left-panel">
              {/* SECTION 1: Patient Information */}
              <div className="medical-card">
                <div className="card-header">
                  <div className="card-header-icon bg-light-primary text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div className="card-header-titles">
                    <h3 className="card-title">Patient Information</h3>
                    <p className="card-subtitle">Enter child details and medical practitioner name</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-new-patient btn-sm"
                    onClick={handleNewPatient}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ marginRight: "6px" }}>
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="20" y1="8" x2="20" y2="14"></line>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    New Patient
                  </button>
                </div>
                <div className="card-body">
                  <div className="form-grid">
                    {/* Patient Name */}
                    <div className="form-group col-span-12">
                      <label htmlFor="patient-name" className="form-label required-label">Child's Full Name</label>
                      <input
                        id="patient-name"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Aarav Sharma"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        required
                      />
                    </div>

                    {/* Patient Age */}
                    <div className="form-group col-span-6">
                      <label htmlFor="patient-age" className="form-label">Age</label>
                      <input
                        id="patient-age"
                        type="text"
                        className="form-control"
                        placeholder="e.g. 4 years or 6 months"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                      />
                    </div>

                    {/* Patient Weight */}
                    <div className="form-group col-span-6">
                      <label htmlFor="patient-weight" className="form-label required-label">Weight (kg)</label>
                      <input
                        id="patient-weight"
                        type="number"
                        step="0.1"
                        min="0"
                        className="form-control"
                        placeholder="e.g. 14.5"
                        value={patientWeight === null ? "" : patientWeight}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setPatientWeight(null);
                          } else {
                            const parsed = parseFloat(val);
                            if (parsed >= 0) {
                              setPatientWeight(parsed);
                            }
                          }
                        }}
                        required
                      />
                    </div>

                    {/* Doctor Name */}
                    <div className="form-group col-span-12">
                      <label htmlFor="doctor-name" className="form-label">Doctor Name</label>
                      <div className="doctor-input-wrapper">
                        <span className="dr-prefix">Dr.</span>
                        <input
                          id="doctor-name"
                          type="text"
                          className="form-control doctor-input"
                          placeholder="Pediatrician's Name"
                          value={doctorName}
                          onChange={(e) => setDoctorName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Medicine Selection */}
              <MedicineSelector
                availableMedicines={mergedMedicines}
                selectedMedicines={selectedMedicines}
                onSelectMedicine={handleSelectMedicine}
              />

              {/* SECTION 3: Selected Medicines list */}
              <div className="medical-card">
                <div className="card-header">
                  <div className="card-header-icon bg-light-primary text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <div className="card-header-titles">
                    <h3 className="card-title">Selected Medications</h3>
                    <p className="card-subtitle">Adjust dosages, override values, and specify frequency</p>
                  </div>
                  {selectedMedicines.length > 0 && (
                    <span className="badge bg-primary text-white count-badge">
                      {selectedMedicines.length}
                    </span>
                  )}
                </div>
                <div className="card-body">
                  {selectedMedicines.length > 0 ? (
                    <div className="selected-meds-list">
                      {selectedMedicines.map((med, index) => {
                        const calculated = calculateDose(med, patientWeight, med.overrideDose);
                        return (
                          <div key={med.id} className="selected-med-card">
                            {/* Card Header */}
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
                                  title="Remove medication"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Card Body fields */}
                            <div className="selected-med-card-body">
                              {/* Frequency pills selector */}
                              <div className="form-group">
                                <label className="form-label mini-label">Frequency (Sig)</label>
                                <div className="frequency-segmented-control">
                                  {(["OD", "BD", "TDS", "HS", "SOS"] as const).map((freq) => {
                                    const labels: Record<string, string> = {
                                      OD: "Once Daily",
                                      BD: "Twice Daily",
                                      TDS: "3x Daily",
                                      HS: "At Bedtime",
                                      SOS: "If Needed"
                                    };
                                    return (
                                      <button
                                        key={freq}
                                        type="button"
                                        className={`frequency-pill-btn ${med.frequency === freq ? "active" : ""}`}
                                        onClick={() => handleUpdateMedicine(med.id, { frequency: freq })}
                                        title={labels[freq]}
                                      >
                                        <span className="freq-code">{freq}</span>
                                        <span className="freq-desc-mini">{labels[freq]}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Form row for Duration and Override Dose */}
                              <div className="med-inputs-row">
                                {/* Duration field with quick tags */}
                                <div className="form-group flex-1">
                                  <label className="form-label mini-label">Duration</label>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="e.g. 5 days"
                                    value={med.duration}
                                    onChange={(e) => handleUpdateMedicine(med.id, { duration: e.target.value })}
                                  />
                                  <div className="quick-tags">
                                    {(["3 days", "5 days", "7 days", "10 days"] as const).map((dayTag) => (
                                      <button
                                        key={dayTag}
                                        type="button"
                                        className="tag-btn"
                                        onClick={() => handleUpdateMedicine(med.id, { duration: dayTag })}
                                      >
                                        {dayTag}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Override Dose field */}
                                <div className="form-group flex-1">
                                  <label className="form-label mini-label">
                                    Override Dose ({med.unit})
                                  </label>
                                  <div className="override-input-wrapper">
                                    <input
                                      type="number"
                                      step="any"
                                      min="0"
                                      className="form-control form-control-sm"
                                      placeholder="Auto calculated"
                                      value={med.overrideDose === null ? "" : med.overrideDose}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const parsed = val === "" ? null : parseFloat(val);
                                        handleUpdateMedicine(med.id, { overrideDose: parsed });
                                      }}
                                    />
                                    {med.overrideDose !== null && (
                                      <button
                                        type="button"
                                        className="override-reset-btn"
                                        onClick={() => handleUpdateMedicine(med.id, { overrideDose: null })}
                                        title="Reset to calculated dose"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Instructions field with quick suggestions */}
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label mini-label">Special Instructions</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder="e.g. After meals, before food, with milk"
                                  value={med.instructions}
                                  onChange={(e) => handleUpdateMedicine(med.id, { instructions: e.target.value })}
                                />
                                <div className="quick-tags">
                                  {(["After meals", "Before food", "At bedtime", "With warm water", "If fever &gt; 38.5&deg;C"] as const).map((insTag) => (
                                    <button
                                      key={insTag}
                                      type="button"
                                      className="tag-btn"
                                      onClick={() => handleUpdateMedicine(med.id, { instructions: insTag })}
                                    >
                                      {insTag}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <svg className="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="9"></line>
                        <line x1="9" y1="13" x2="15" y2="13"></line>
                        <line x1="9" y1="17" x2="13" y2="17"></line>
                      </svg>
                      <p className="empty-state-text">No medications selected yet</p>
                      <p className="empty-state-sub">Select medications from the catalog above to add them here.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4: Advice & Follow-up */}
              <div className="medical-card">
                <div className="card-header">
                  <div className="card-header-icon bg-light-primary text-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <div className="card-header-titles">
                    <h3 className="card-title">Advice & Follow-up</h3>
                    <p className="card-subtitle">Provide general consultation advice and follow-up timing</p>
                  </div>
                </div>
                <div className="card-body">
                  <div className="form-grid">
                    {/* Advice Textarea */}
                    <div className="form-group col-span-12">
                      <label htmlFor="advice-textarea" className="form-label">Advice / Remarks</label>
                      <textarea
                        id="advice-textarea"
                        className="form-control"
                        rows={3}
                        placeholder="e.g. Hydrate adequately, avoid cold foods, rest for 3 days"
                        value={advice}
                        onChange={(e) => setAdvice(e.target.value)}
                      ></textarea>
                    </div>

                    {/* Follow-up input */}
                    <div className="form-group col-span-12">
                      <label htmlFor="followup-input" className="form-label">Follow-up Timing</label>
                      <input
                        id="followup-input"
                        type="text"
                        className="form-control"
                        placeholder="e.g. Review after 5 days or if symptoms worsen"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SIG Cheat Sheet */}
              <LatinLegend />

              {/* History list */}
              <PrescriptionHistory
                history={savedHistory}
                onLoad={handleLoadPrescription}
                onDelete={handleDeletePrescription}
              />
            </div>

            {/* Right Panel: Sticky Live Preview */}
            <div className="right-panel">
              <PrescriptionPreview
                rxNumber={rxNumber}
                currentDate={currentDateStr}
                patientName={patientName}
                patientAge={patientAge}
                patientWeight={patientWeight}
                doctorName={doctorName}
                selectedMedicines={selectedMedicines}
                advice={advice}
                followUp={followUp}
                onClearAll={handleClearAll}
                onPrint={handlePrint}
                pages={prescriptionPages}
                isMeasuring={isMeasuring}
                showHeader={showHeader}
                showFooter={showFooter}
                keepLetterheadSpace={keepLetterheadSpace}
              />
            </div>
          </div>
        </main>
      </div>

      {/* PRINT-ONLY — rendered by PrescriptionPage, not a separate layout */}
      <div className="print-only">
        {prescriptionPages.map(pageData => (
          <PrescriptionPage
            key={pageData.pageNumber}
            rxNumber={rxNumber}
            currentDate={currentDateStr}
            patientName={patientName}
            patientAge={patientAge}
            patientWeight={patientWeight}
            doctorName={doctorName}
            pageData={pageData}
            totalPages={prescriptionPages.length}
            advice={advice}
            followUp={followUp}
            isPreview={false}
            showHeader={showHeader}
            showFooter={showFooter}
            keepLetterheadSpace={keepLetterheadSpace}
          />
        ))}
      </div>

      {/* Settings Panel Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        googleSheetsUrl={googleSheetsUrl}
        onSaveSheetsUrl={handleSaveSheetsUrl}
        medicines={mergedMedicines}
        onAddMedicine={handleAddMedicine}
        onDeleteMedicine={handleDeleteMedicine}
        onRestoreDefaults={handleRestoreDefaults}
        isSyncing={isSyncing}
        showHeader={showHeader}
        onShowHeaderChange={handleShowHeaderChange}
        showFooter={showFooter}
        onShowFooterChange={handleShowFooterChange}
        keepLetterheadSpace={keepLetterheadSpace}
        onKeepLetterheadSpaceChange={handleKeepLetterheadSpaceChange}
      />
    </div>
  );
};
