import React, { useState } from "react";
import type { Medicine } from "../utils/doseCalculator";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleSheetsUrl: string;
  onSaveSheetsUrl: (url: string) => void;
  medicines: Medicine[];
  onAddMedicine: (med: Medicine) => Promise<boolean>;
  onDeleteMedicine: (name: string, form: string, strength: string) => Promise<boolean>;
  onRestoreDefaults: () => Promise<boolean>;
  isSyncing: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  googleSheetsUrl,
  onSaveSheetsUrl,
  medicines,
  onAddMedicine,
  onDeleteMedicine,
  onRestoreDefaults,
  isSyncing
}) => {
  const [activeTab, setActiveTab] = useState<"sheets" | "medicines">("sheets");
  const [inputUrl, setInputUrl] = useState(googleSheetsUrl);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // Medicine Form States
  const [medName, setMedName] = useState("");
  const [medForm, setMedForm] = useState("Syrup");
  const [medStrength, setMedStrength] = useState("");
  const [medCalcType, setMedCalcType] = useState<"calculated" | "fixed">("calculated");
  const [medUnit, setMedUnit] = useState("mg");
  const [medDosePerKg, setMedDosePerKg] = useState("");
  const [medMaxDose, setMedMaxDose] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    await onRestoreDefaults();
    setIsRestoring(false);
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!inputUrl) {
      setTestStatus("error");
      setTestMessage("Please enter a valid Google Apps Script Web App URL first.");
      return;
    }
    setTestStatus("testing");
    setTestMessage("");

    try {
      // Test GET request to fetch medicines
      const response = await fetch(inputUrl, { method: "GET" });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setTestStatus("success");
        setTestMessage(`Connection successful! Loaded ${data.length} medicines from your Sheet.`);
        onSaveSheetsUrl(inputUrl);
      } else {
        throw new Error("Invalid response format. Make sure you deployed the correct Apps Script as a Web App.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(`Failed to connect: ${err.message || err}. Ensure CORS is enabled and the URL is public.`);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !medForm || !medStrength) return;

    setIsAdding(true);
    const newMed: Medicine = {
      name: medName.trim(),
      form: medForm.trim(),
      strength: medStrength.trim(),
      dosePerKg: medCalcType === "fixed" ? null : parseFloat(medDosePerKg) || null,
      unit: medUnit.trim(),
      maxDose: medCalcType === "fixed" ? null : parseFloat(medMaxDose) || null
    };

    const success = await onAddMedicine(newMed);
    setIsAdding(false);
    if (success) {
      // Reset Form
      setMedName("");
      setMedStrength("");
      setMedDosePerKg("");
      setMedMaxDose("");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            <h3>Clinic Settings</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          <button 
            className={`modal-tab-btn ${activeTab === "sheets" ? "active" : ""}`}
            onClick={() => setActiveTab("sheets")}
          >
            Google Sheets Sync
          </button>
          <button 
            className={`modal-tab-btn ${activeTab === "medicines" ? "active" : ""}`}
            onClick={() => setActiveTab("medicines")}
          >
            Manage Medicine Catalog
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* TAB 1: Google Sheets Sync */}
          {activeTab === "sheets" && (
            <div className="settings-tab-content">
              <div className="settings-info-box">
                <h4>Syncing clinic data to Google Sheets</h4>
                <p>
                  By setting up Google Sheets, prescriptions will be logged in real-time and your custom medications list will be synced across all devices for free.
                </p>
                <a 
                  href="file:///c:/Users/ashis/.gemini/antigravity-ide/brain/4e47331c-f1a5-4f34-b6d1-9082800a2ffe/implementation_plan.md" 
                  className="settings-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  View Apps Script Setup Instructions &rarr;
                </a>
              </div>

              <div className="form-group" style={{ marginTop: "16px" }}>
                <label className="form-label required-label" htmlFor="sheets-url">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="sheets-url"
                  type="text"
                  className="form-control"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
              </div>

              <div className="settings-actions-row">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setInputUrl("");
                    onSaveSheetsUrl("");
                    setTestStatus("idle");
                    setTestMessage("");
                  }}
                  disabled={!inputUrl}
                >
                  Disconnect Sheet
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleTestConnection}
                  disabled={testStatus === "testing"}
                >
                  {testStatus === "testing" ? "Connecting..." : "Test & Save URL"}
                </button>
              </div>

              {testStatus !== "idle" && (
                <div className={`settings-alert-box alert-${testStatus}`}>
                  <div className="alert-title">
                    {testStatus === "testing" && "Verifying Connection..."}
                    {testStatus === "success" && "Success!"}
                    {testStatus === "error" && "Connection Failed"}
                  </div>
                  <p className="alert-message">{testMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Manage Medicines */}
          {activeTab === "medicines" && (
            <div className="settings-tab-content grid-split">
              {/* Left Column: Form to Add Medicine */}
              <div className="medicine-form-col">
                <h4>Add New Medicine</h4>
                <form onSubmit={handleAddSubmit} className="medicine-add-form">
                  <div className="form-group">
                    <label className="form-label required-label" htmlFor="med-name">Medicine Name</label>
                    <input
                      id="med-name"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. Paracetamol"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="med-form-row">
                    <div className="form-group flex-1">
                      <label className="form-label required-label" htmlFor="med-form">Form</label>
                      <select
                        id="med-form"
                        className="form-control form-control-sm"
                        value={medForm}
                        onChange={(e) => setMedForm(e.target.value)}
                      >
                        <option value="Syrup">Syrup</option>
                        <option value="Suspension">Suspension</option>
                        <option value="Tablet">Tablet</option>
                        <option value="Chewable Tablet">Chewable Tablet</option>
                        <option value="Dispersible Tablet">Dispersible Tablet</option>
                        <option value="Drops">Drops</option>
                        <option value="Inhaler">Inhaler</option>
                        <option value="Ointment">Ointment</option>
                      </select>
                    </div>

                    <div className="form-group flex-1">
                      <label className="form-label required-label" htmlFor="med-strength">Strength</label>
                      <input
                        id="med-strength"
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="e.g. 120mg/5ml or 20mg"
                        value={medStrength}
                        onChange={(e) => setMedStrength(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dose Type</label>
                    <div className="segmented-inline">
                      <button
                        type="button"
                        className={`seg-btn ${medCalcType === "calculated" ? "active" : ""}`}
                        onClick={() => {
                          setMedCalcType("calculated");
                          setMedUnit("mg");
                        }}
                      >
                        mg/kg (Calculated)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${medCalcType === "fixed" ? "active" : ""}`}
                        onClick={() => {
                          setMedCalcType("fixed");
                          setMedUnit("tab");
                        }}
                      >
                        Fixed Dose (As Directed)
                      </button>
                    </div>
                  </div>

                  {medCalcType === "calculated" && (
                    <div className="med-form-row">
                      <div className="form-group flex-1">
                        <label className="form-label required-label" htmlFor="med-dosekg">Dose/Kg (mg)</label>
                        <input
                          id="med-dosekg"
                          type="number"
                          step="any"
                          min="0"
                          className="form-control form-control-sm"
                          placeholder="e.g. 15"
                          value={medDosePerKg}
                          onChange={(e) => setMedDosePerKg(e.target.value)}
                          required={medCalcType === "calculated"}
                        />
                      </div>

                      <div className="form-group flex-1">
                        <label className="form-label" htmlFor="med-maxdose">Max Dose (mg)</label>
                        <input
                          id="med-maxdose"
                          type="number"
                          step="any"
                          min="0"
                          className="form-control form-control-sm"
                          placeholder="e.g. 500"
                          value={medMaxDose}
                          onChange={(e) => setMedMaxDose(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label required-label" htmlFor="med-unit">Dose Dispensing Unit</label>
                    <input
                      id="med-unit"
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. mg, ml, tab, drops"
                      value={medUnit}
                      onChange={(e) => setMedUnit(e.target.value)}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: "100%", marginTop: "8px" }}
                    disabled={isAdding || isSyncing}
                  >
                    {isAdding || isSyncing ? "Syncing..." : "Add to Catalog"}
                  </button>
                </form>
              </div>

              {/* Right Column: List of Existing Medicines */}
              <div className="medicine-list-col">
                <div className="medicine-list-header">
                  <h4>
                    Active Catalog {isSyncing && <span style={{ fontSize: "11px", color: "var(--primary)", fontWeight: "normal" }}>(Syncing...)</span>}
                  </h4>
                  <span className="badge bg-primary text-white">{medicines.length} Medicines</span>
                </div>
                {googleSheetsUrl && (
                  <div style={{ marginBottom: "12px", padding: "10px", borderRadius: "6px", backgroundColor: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", display: "flex", gap: "10px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#10b981", color: "#ffffff", border: "none" }}
                      onClick={handleRestore}
                      disabled={isRestoring || isSyncing}
                    >
                      {isRestoring ? "Restoring..." : "Restore Missing Defaults"}
                    </button>
                    <span style={{ fontSize: "11px", color: "#065f46" }}>
                      Sync missing default medicines to your Google Sheet catalog without deleting custom ones.
                    </span>
                  </div>
                )}
                <div className="medicine-table-wrapper">
                  <table className="settings-medicine-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Form & Strength</th>
                        <th>Type</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map((med) => {
                        const defaultNames = [
                          "Amoxicillin", "Paracetamol", "Ibuprofen", "Cetirizine", 
                          "Azithromycin", "Salbutamol", "Zinc Sulfate", "Domperidone", 
                          "Ondansetron", "Montelukast", "Ofloxacin", "Vitamin D3"
                        ];
                        const isSystem = defaultNames.includes(med.name) && 
                                         (med.strength === "125mg/5ml" || med.strength === "120mg/5ml" || med.strength === "100mg/5ml" || med.strength === "5mg/5ml" || med.strength === "200mg/5ml" || med.strength === "2mg/5ml" || med.strength === "20mg" || med.strength === "1mg/ml" || med.strength === "2mg/5ml" || med.strength === "4mg" || med.strength === "50mg/5ml" || med.strength === "400IU/drop");

                        return (
                          <tr key={`${med.name}-${med.form}-${med.strength}`}>
                            <td className="font-semibold">{med.name}</td>
                            <td>
                              <span className="print-form-badge">{med.form}</span>
                              <span className="print-strength-label">{med.strength}</span>
                            </td>
                            <td>
                              <span className={`badge ${isSystem ? "badge-system" : "badge-custom"}`}>
                                {isSystem ? "System" : "Custom"}
                              </span>
                            </td>
                            <td>
                              {!isSystem ? (
                                <button
                                  type="button"
                                  className="btn-delete-med-setting"
                                  onClick={() => onDeleteMedicine(med.name, med.form, med.strength)}
                                  title="Delete from catalog"
                                  disabled={isSyncing}
                                >
                                  Delete
                                </button>
                              ) : (
                                <span className="text-muted" style={{ fontSize: "11px" }}>Lock</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
