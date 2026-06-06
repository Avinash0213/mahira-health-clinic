import React, { useState } from "react";
import { patientService } from "../services/patientService";
import { visitService } from "../services/visitService";
import { vitalService } from "../services/vitalService";
import type { Patient } from "../types/patient";



export const ReceptionistPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Patient Registration fields
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [ageYears, setAgeYears] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [primaryContactPhone, setPrimaryContactPhone] = useState("");

  // Vitals
  const [height, setHeight] = useState<number | "">("");
  const [weight, setWeight] = useState<number | "">("");

  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);



  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setMessage({ type: "error", text: "Please enter a name, phone, or patient code to search" });
      return;
    }

    setIsSearching(true);
    setMessage(null);
    try {
      const results = await patientService.searchPatients(query);
      setSearchResults(results);
      setShowSuggestions(true);
      if (results.length === 1) {
        selectPatient(results[0]);
        setMessage({ type: "success", text: "Patient found! Details loaded." });
      } else if (results.length > 1) {
        setMessage({ type: "success", text: `Found ${results.length} matching patients. Please select one.` });
      } else {
        setExistingPatient(null);
        // Clear fields but prepopulate name or phone if it looks like one
        const isNum = /^\d+$/.test(query);
        setName(isNum ? "" : query);
        setPhone(isNum ? query : "");
        setPrimaryContactPhone("");
        setGender("");
        setDob("");
        setAgeYears("");
        setMessage({ type: "success", text: "No matching patient found. Fill in details to register." });
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to search patient. Check connection." });
    } finally {
      setIsSearching(false);
    }
  };

  const selectPatient = async (patient: Patient) => {
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

  const handleClear = () => {
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
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanDob = dob.trim();

    if (!cleanName || weight === "") {
      setMessage({ type: "error", text: "Name and Weight are required" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

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

      setMessage({ type: "success", text: `Success! ${cleanName} added to the queue.` });
      
      // Clear inputs
      handleClear();
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: `Failed to add patient to queue: ${err.message || err}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="medical-card" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <div className="card-header">
        <div className="card-header-icon bg-light-primary text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        </div>
        <div className="card-header-titles">
          <h3 className="card-title">Patient Receptionist Desk</h3>
          <p className="card-subtitle">Register patient, record vitals, and add to consultation queue</p>
        </div>
      </div>

      <div className="card-body">
        {message && (
          <div 
            style={{ 
              padding: "12px", 
              borderRadius: "var(--radius-sm)", 
              marginBottom: "20px",
              backgroundColor: message.type === "success" ? "rgba(10, 124, 107, 0.08)" : "var(--danger-light)",
              border: `1px solid ${message.type === "success" ? "var(--primary-border)" : "#f8b4b4"}`,
              color: message.type === "success" ? "var(--primary-dark)" : "var(--danger)",
              fontSize: "14px"
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          {/* Patient Search Row */}
          <div className="form-group col-span-12" style={{ position: "relative", marginBottom: "16px" }}>
            <label htmlFor="patient-search-query" className="form-label">Search Patient</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                id="patient-search-query"
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
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ height: "42px", padding: "0 20px", whiteSpace: "nowrap" }}
                onClick={handleSearch}
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
                    onClick={() => selectPatient(p)}
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
                        Code: {p.patient_code} &middot; Phone: {p.phone || "N/A"} &middot; Guardian: {p.primary_contact_phone || "N/A"}
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
                onClick={handleClear}
                style={{ height: "32px", padding: "0 12px" }}
              >
                Deselect / Clear
              </button>
            </div>
          )}

          {/* Child's Name */}
          <div className="form-group col-span-8">
            <label htmlFor="patient-name" className="form-label required-label">Child's Full Name</label>
            <input
              id="patient-name"
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
            <label htmlFor="patient-gender" className="form-label">Gender</label>
            <select
              id="patient-gender"
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
            <label htmlFor="patient-age" className="form-label">Age (Years)</label>
            <input
              id="patient-age"
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
            <label htmlFor="patient-phone-field" className="form-label">Patient's Phone</label>
            <input
              id="patient-phone-field"
              type="number"
              className="form-control"
              placeholder="Patient phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group col-span-6">
            <label htmlFor="patient-primary-contact" className="form-label">Primary Contact/Guardian Name</label>
            <input
              id="patient-primary-contact"
              type="text"
              className="form-control"
              placeholder="Parent/Guardian name"
              value={primaryContactPhone}
              onChange={(e) => setPrimaryContactPhone(e.target.value)}
            />
          </div>

          {/* Height */}
          <div className="form-group col-span-6">
            <label htmlFor="patient-height" className="form-label">Height (cm)</label>
            <input
              id="patient-height"
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
            <label htmlFor="patient-weight" className="form-label required-label">Weight (kg)</label>
            <input
              id="patient-weight"
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
              onClick={handleClear}
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
  );
};
