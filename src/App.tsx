import React, { useState, useEffect, useMemo } from "react";
import { MahiraLogo } from "./components/MahiraLogo";
import { SettingsModal } from "./components/SettingsModal";
import { ReceptionistPage } from "./pages/ReceptionistPage";
import { DoctorPage } from "./pages/DoctorPage";
import { PrescriptionPage } from "./components/PrescriptionPage";
import { isSupabaseConfigured } from "./supabase/client";
import { prescriptionService } from "./services/prescriptionService";
import { patientService } from "./services/patientService";
import { visitService } from "./services/visitService";
import { vitalService } from "./services/vitalService";
import type { Medicine } from "./utils/doseCalculator";
import { MEDICINE_DATASET } from "./utils/doseCalculator";

// Helper to format date as "DD MMM YYYY"
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Parser to turn age text to a DOB date string
const parseAgeToDob = (ageStr: string): string => {
  const today = new Date();
  let years = 0;
  let months = 0;

  const yearMatch = ageStr.match(/(\d+)\s*year/i);
  const monthMatch = ageStr.match(/(\d+)\s*month/i);

  if (yearMatch) years = parseInt(yearMatch[1]);
  if (monthMatch) months = parseInt(monthMatch[1]);

  if (years === 0 && months === 0) {
    years = 5; // default fallback if unparseable
  }

  const dob = new Date(today.getFullYear() - years, today.getMonth() - months, today.getDate());
  return dob.toISOString().split("T")[0];
};

export const App: React.FC = () => {
  // Hash Routing state
  const [currentPath, setCurrentPath] = useState<"home" | "receptionist" | "doctor">(() => {
    const hash = window.location.hash;
    if (hash === "#/receptionist") return "receptionist";
    if (hash === "#/doctor") return "doctor";
    return "home";
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [hasLocalData, setHasLocalData] = useState<boolean>(false);
  const [migrationStatus, setMigrationStatus] = useState<"idle" | "migrating" | "success" | "error">("idle");
  const [migrationMessage, setMigrationMessage] = useState<string>("");

  // Print execution state (rendered at root level)
  const [printData, setPrintData] = useState<{
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
  } | null>(null);

  // Supabase connection
  const isConnected = isSupabaseConfigured();

  // Medicine catalog states
  const [availableMedicines, setAvailableMedicines] = useState<Medicine[]>([]);
  const [isCatalogSyncing, setIsCatalogSyncing] = useState<boolean>(false);

  // Print configuration states
  const currentDateStr = useMemo(() => formatDate(new Date()), []);

  // Listen to hash change routing events
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#/receptionist") setCurrentPath("receptionist");
      else if (hash === "#/doctor") setCurrentPath("doctor");
      else setCurrentPath("home");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Execute print effect
  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintData(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  // Fetch medicines catalog
  const loadCatalog = async () => {
    setIsCatalogSyncing(true);
    try {
      const catalog = await prescriptionService.getMedicinesCatalog();
      setAvailableMedicines(catalog);
    } catch (err) {
      console.error("Failed to load medicine catalog:", err);
      setAvailableMedicines(MEDICINE_DATASET);
    } finally {
      setIsCatalogSyncing(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    const saved = localStorage.getItem("mhc_prescriptions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasLocalData(true);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  // Sync methods for settings catalog
  const handleAddMedicine = async (med: Medicine): Promise<boolean> => {
    if (!isConnected) return false;
    const success = await prescriptionService.addMedicineToCatalog(med);
    if (success) {
      await loadCatalog();
    }
    return success;
  };

  const handleDeleteMedicine = async (name: string, form: string, strength: string): Promise<boolean> => {
    if (!isConnected) return false;
    const success = await prescriptionService.deleteMedicineFromCatalog(name, form, strength);
    if (success) {
      await loadCatalog();
    }
    return success;
  };

  const handleRestoreDefaults = async (): Promise<boolean> => {
    if (!isConnected) return false;
    const success = await prescriptionService.restoreCatalogDefaults();
    if (success) {
      await loadCatalog();
    }
    return success;
  };

  // Perform migration from localStorage to Supabase
  const handleMigrateData = async () => {
    if (!isConnected) {
      alert("Please connect to Supabase database first before migrating legacy data.");
      return;
    }

    const saved = localStorage.getItem("mhc_prescriptions");
    if (!saved) return;

    const confirmMigrate = window.confirm("This will migrate all your locally saved prescriptions to Supabase. Would you like to proceed?");
    if (!confirmMigrate) return;

    setMigrationStatus("migrating");
    setMigrationMessage("Migrating patients and visits...");

    try {
      const prescriptionsList = JSON.parse(saved);
      let successCount = 0;

      for (const rx of prescriptionsList) {
        try {
          const generatedPhone = `MIG-${rx.rxNumber}`;
          
          const patient = await patientService.createPatient({
            name: rx.patientName || "Migrated Patient",
            phone: generatedPhone,
            date_of_birth: parseAgeToDob(rx.patientAge || "")
          });

          const visit = await visitService.createVisit({
            patient_id: patient.id,
            status: "completed"
          });

          await vitalService.createVital({
            visit_id: visit.id,
            height_cm: null,
            weight_kg: rx.patientWeight || null
          });

          const rxPayload = {
            visit_id: visit.id,
            notes: rx.advice || "",
            doctor_name: rx.doctorName || "",
            follow_up: rx.followUp || "",
            rx_number: rx.rxNumber
          };

          const itemsPayload = (rx.selectedMedicines || []).map((med: any) => ({
            medicine_name: med.name,
            dosage: med.overrideDose ? `${med.overrideDose} ${med.unit}` : `${med.dosePerKg || ""} mg/kg`,
            duration: med.duration,
            instructions: med.instructions,
            frequency: med.frequency,
            medicine_form: med.form,
            medicine_strength: med.strength,
            override_dose: med.overrideDose,
            dose_per_kg: med.dosePerKg,
            unit: med.unit
          }));

          await prescriptionService.createPrescription(rxPayload, itemsPayload);
          successCount++;
        } catch (err) {
          console.error(`Failed to migrate prescription ${rx.rxNumber}:`, err);
        }
      }

      setMigrationStatus("success");
      setMigrationMessage(`Successfully migrated ${successCount} out of ${prescriptionsList.length} prescriptions to Supabase!`);
      localStorage.removeItem("mhc_prescriptions");
      setHasLocalData(false);
    } catch (err: any) {
      console.error(err);
      setMigrationStatus("error");
      setMigrationMessage(`Migration failed: ${err.message || err}`);
    }
  };

  return (
    <div className="app-container">
      {/* SCREEN ONLY UI WRAPPER */}
      <div className="screen-only">
        {/* Top Navbar */}
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

              {/* Navigation Back Link */}
              {currentPath !== "home" && (
                <a 
                  href="#/" 
                  className="back-nav-link"
                  style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "6px", 
                    textDecoration: "none", 
                    color: "var(--slate)", 
                    fontWeight: 600, 
                    fontSize: "13.5px",
                    marginLeft: "24px",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--white)"
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  <span className="back-nav-text">Back to Dashboard</span>
                </a>
              )}
            </div>

            <div className="nav-right" style={{ gap: "12px" }}>
              {/* Supabase Status Indicator */}
              <span 
                className={`sync-status-indicator ${isConnected ? "" : "offline"}`} 
                title={isConnected ? "Connected to Supabase Database" : "Database Offline / Click Settings to configure"}
              >
                <span 
                  className="live-dot" 
                  style={{ 
                    backgroundColor: isConnected ? "#10b981" : "#c0392b",
                    animation: isConnected ? "pulse-live 1.8s infinite" : "none" 
                  }}
                ></span>
                {isConnected ? "Database Connected" : "Database Offline"}
              </span>

              {/* Settings button */}
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

              {/* Date badge */}
              <div className="date-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

        {/* Workspace Area */}
        <main className="main-workspace">
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px" }}>
            {/* Warning banner */}
            {!isConnected && (
              <div 
                className="info-banner"
                style={{ 
                  padding: "16px 24px", 
                  backgroundColor: "rgba(192, 57, 43, 0.08)", 
                  border: "1px solid rgba(192, 57, 43, 0.2)", 
                  color: "var(--danger)",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px" }}>Database Connection Required</strong>
                  <p style={{ fontSize: "12.5px", marginTop: "2px", opacity: 0.9 }}>
                    Supabase URL and API keys are missing or unconfigured. Please configure the environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect.
                  </p>
                </div>
              </div>
            )}

            {/* Migration banner */}
            {hasLocalData && isConnected && (
              <div 
                className="info-banner"
                style={{ 
                  padding: "16px 24px", 
                  backgroundColor: "rgba(10, 124, 107, 0.08)", 
                  border: "1px solid var(--primary-border)", 
                  color: "var(--primary-dark)",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px" }}>Prescription History Found in Browser Storage</strong>
                  <p style={{ fontSize: "12.5px", marginTop: "2px", opacity: 0.9 }}>
                    There are historical patient prescriptions saved locally. Migrate them to Supabase so they are synchronized and accessible across all devices.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleMigrateData}
                  disabled={migrationStatus === "migrating"}
                  style={{ backgroundColor: "var(--primary)", border: "none" }}
                >
                  {migrationStatus === "migrating" ? "Migrating..." : "Migrate History now"}
                </button>
              </div>
            )}

            {migrationStatus !== "idle" && migrationStatus !== "migrating" && (
              <div 
                style={{ 
                  padding: "12px 24px", 
                  backgroundColor: migrationStatus === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(192, 57, 43, 0.08)", 
                  border: `1px solid ${migrationStatus === "success" ? "#10b981" : "#f8b4b4"}`,
                  color: migrationStatus === "success" ? "#065f46" : "var(--danger)",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "24px",
                  fontSize: "13.5px"
                }}
              >
                {migrationMessage}
              </div>
            )}

            {/* Hash Route Switching */}
            {currentPath === "home" && (
              <div style={{ maxWidth: "800px", margin: "60px auto", padding: "0 24px" }}>
                <div style={{ textAlign: "center", marginBottom: "48px" }}>
                  <h2 className="font-display" style={{ fontSize: "32px", color: "var(--navy)" }}>Mahira Health Care</h2>
                  <p style={{ color: "var(--muted)", fontSize: "15px", marginTop: "8px" }}>
                    Clinic Management & Prescription Systems
                  </p>
                </div>

                <div className="role-card-grid">
                  <a 
                    href="#/receptionist" 
                    className="medical-card" 
                    style={{ 
                      textDecoration: "none", 
                      padding: "32px 24px", 
                      textAlign: "center", 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <div className="card-header-icon bg-light-primary text-primary" style={{ width: "60px", height: "60px", marginBottom: "16px" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", marginBottom: "8px" }}>Receptionist Desk</h3>
                    <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
                      Lookup or register patients, record height & weight vitals, and add patients to the waiting queue.
                    </p>
                  </a>

                  <a 
                    href="#/doctor" 
                    className="medical-card" 
                    style={{ 
                      textDecoration: "none", 
                      padding: "32px 24px", 
                      textAlign: "center", 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                  >
                    <div className="card-header-icon bg-light-primary text-primary" style={{ width: "60px", height: "60px", marginBottom: "16px" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--navy)", marginBottom: "8px" }}>Doctor Workstation</h3>
                    <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.4 }}>
                      View waiting patient queue in real-time, load details/vitals, view history, prescribe medications, and print.
                    </p>
                  </a>
                </div>
              </div>
            )}

            {currentPath === "receptionist" && <ReceptionistPage />}

            {currentPath === "doctor" && (
              <DoctorPage 
                availableMedicines={availableMedicines}
                onPrintTrigger={setPrintData}
              />
            )}
          </div>
        </main>

        {/* Settings Modal Setup */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isConnected={isConnected}
          medicines={availableMedicines}
          onAddMedicine={handleAddMedicine}
          onDeleteMedicine={handleDeleteMedicine}
          onRestoreDefaults={handleRestoreDefaults}
          isSyncing={isCatalogSyncing}
        />
      </div>

      {/* PRINT ONLY UI WRAPPER (Outside screen-only container for clean A4 media printing) */}
      {printData && (
        <div className="print-only">
          {printData.prescriptionPages.map((pageData) => (
            <PrescriptionPage
              key={pageData.pageNumber}
              rxNumber={printData.rxNumber}
              currentDate={printData.currentDateStr}
              patientName={printData.patientName}
              patientAge={printData.patientAge}
              patientWeight={printData.patientWeight}
              doctorName={printData.doctorName}
              patientGender={printData.patientGender}
              patientPhone={printData.patientPhone}
              patientCode={printData.patientCode}
              pageData={pageData}
              totalPages={printData.prescriptionPages.length}
              advice={printData.advice}
              followUp={printData.followUp}
              investigations={printData.investigations}
              isPreview={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};
