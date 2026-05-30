import React, { useState, useEffect, useMemo } from "react";
import { calculateDose } from "./utils/doseCalculator";
import type { Medicine } from "./utils/doseCalculator";
import { MedicineSelector } from "./components/MedicineSelector";
import { PrescriptionPreview } from "./components/PrescriptionPreview";
import type { SelectedMedicineInstance } from "./components/PrescriptionPreview";
import { LatinLegend } from "./components/LatinLegend";
import { PrescriptionHistory } from "./components/PrescriptionHistory";
import type { SavedPrescription } from "./components/PrescriptionHistory";

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

  // Format once per session/render
  const currentDateStr = useMemo(() => formatDate(new Date()), []);

  // Initialize Rx number and History on load
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
  }, []);

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

    // Wait short delay to ensure React commits state, then trigger print dialog
    setTimeout(() => {
      window.print();
    }, 150);
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
              <div className="clinic-logo">
                <span>M</span>
              </div>
              <div className="clinic-branding">
                <h1 className="clinic-title font-display">Mahira Health Clinic</h1>
                <p className="clinic-subtitle">Pediatric Care System</p>
              </div>
            </div>
            <div className="nav-right">
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
              />
            </div>
          </div>
        </main>
      </div>

      {/* PRINT-ONLY PRESCRIPTION DOCUMENT */}
      <div className="print-only prescription-print-document">
        {/* Print Header */}
        <div className="print-header">
          <div className="print-header-left">
            <h1 className="print-clinic-name font-display">Mahira Health Clinic</h1>
            <p className="print-clinic-sub font-mono">PEDIATRIC CARE &bull; SPECIALIST PRESCRIPTION</p>
          </div>
          <div className="print-header-right font-mono">
            <div><strong>Rx No:</strong> {rxNumber}</div>
            <div><strong>Date:</strong> {currentDateStr}</div>
            {doctorName && <div><strong>Doctor:</strong> Dr. {doctorName}</div>}
          </div>
        </div>

        {/* Patient Information Block */}
        <div className="print-patient-block">
          <div className="print-patient-grid">
            <div className="print-patient-cell">
              <span className="print-lbl">PATIENT NAME</span>
              <span className="print-val font-semibold">{patientName || "—"}</span>
            </div>
            <div className="print-patient-cell">
              <span className="print-lbl">AGE</span>
              <span className="print-val">{patientAge || "—"}</span>
            </div>
            <div className="print-patient-cell">
              <span className="print-lbl">WEIGHT</span>
              <span className="print-val">
                {patientWeight !== null && patientWeight > 0 ? `${patientWeight} kg` : "—"}
              </span>
            </div>
            <div className="print-patient-cell">
              <span className="print-lbl">DATE</span>
              <span className="print-val">{currentDateStr}</span>
            </div>
          </div>
        </div>

        {/* Prescription Symbol and Table */}
        <div className="print-body">
          <div className="print-rx-symbol font-display text-primary">Rx</div>

          <table className="print-medicine-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>#</th>
                <th style={{ width: "25%" }}>Medicine</th>
                <th style={{ width: "20%" }}>Form &middot; Strength</th>
                <th style={{ width: "15%" }}>Dose</th>
                <th style={{ width: "15%" }}>Frequency</th>
                <th style={{ width: "10%" }}>Duration</th>
                <th style={{ width: "10%" }}>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {selectedMedicines.map((med, index) => {
                const calculated = calculateDose(med, patientWeight, med.overrideDose);
                
                // Print Dose Rules logic:
                // - Liquid: volume and weight display e.g. "240mg (10ml)"
                // - Override dose: use override value
                // - Tablet/drops: "As Directed" (if dosePerKg is null)
                let printedDose = calculated.doseText;
                if (med.overrideDose === null && med.dosePerKg === null) {
                  printedDose = "As Directed";
                }

                const freqLabels: Record<string, string> = {
                  OD: "Once Daily",
                  BD: "Twice Daily",
                  TDS: "Three Times Daily",
                  HS: "At Bedtime",
                  SOS: "If Needed"
                };

                return (
                  <tr key={med.id}>
                    <td>{index + 1}</td>
                    <td className="font-semibold">{med.name}</td>
                    <td>
                      <span className="print-form-badge">{med.form}</span>
                      <span className="print-strength-label">{med.strength}</span>
                    </td>
                    <td className="font-semibold text-primary font-mono">{printedDose}</td>
                    <td>
                      <div><strong>{med.frequency}</strong></div>
                      <div className="print-freq-sub">{freqLabels[med.frequency]}</div>
                    </td>
                    <td>{med.duration || "—"}</td>
                    <td className="print-instructions-cell">{med.instructions || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Advice block */}
          {advice && (
            <div className="print-section-container">
              <h3 className="print-section-heading">ADVICE & INSTRUCTIONS</h3>
              <p className="print-section-text">{advice}</p>
            </div>
          )}

          {/* Follow-up block */}
          {followUp && (
            <div className="print-section-container">
              <h3 className="print-section-heading">FOLLOW-UP VISIT</h3>
              <p className="print-section-text font-semibold">{followUp}</p>
            </div>
          )}

          {/* Disclaimer Box */}
          <div className="print-disclaimer-box">
            This prescription is valid for one-time dispensing only. Kindly consult the doctor before making any change in medication.
          </div>
        </div>

        {/* Print Footer */}
        <div className="print-footer">
          <div className="print-footer-left font-mono">
            <div>Mahira Health Clinic</div>
            <div>Rx Number: {rxNumber}</div>
          </div>
          <div className="print-footer-right">
            <div className="print-sig-line"></div>
            <div className="print-sig-label">Doctor Signature</div>
            <div className="print-stamp-label">Stamp & Seal</div>
          </div>
        </div>
      </div>
    </div>
  );
};
