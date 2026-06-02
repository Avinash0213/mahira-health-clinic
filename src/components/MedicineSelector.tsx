import React, { useState } from "react";
import type { Medicine } from "../utils/doseCalculator";

interface MedicineSelectorProps {
  availableMedicines: Medicine[];
  selectedMedicines: { name: string; form: string; strength: string }[];
  onSelectMedicine: (medicine: Medicine) => void;
}

export const MedicineSelector: React.FC<MedicineSelectorProps> = ({
  availableMedicines,
  selectedMedicines,
  onSelectMedicine
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  // Determine if a medicine is already selected
  const isSelected = (med: Medicine) => {
    return selectedMedicines.some(
      (s) =>
        s.name.toLowerCase() === med.name.toLowerCase() &&
        s.form.toLowerCase() === med.form.toLowerCase() &&
        s.strength.toLowerCase() === med.strength.toLowerCase()
    );
  };

  // Filter medicines based on search box and selection status
  const filteredMedicines = availableMedicines.filter((med) => {
    const isAlreadySelected = isSelected(med);
    if (isAlreadySelected) return false;

    const query = searchQuery.toLowerCase();
    return (
      med.name.toLowerCase().includes(query) ||
      med.form.toLowerCase().includes(query) ||
      med.strength.toLowerCase().includes(query)
    );
  });

  return (
    <div className="medical-card medicine-selector-card screen-only">
      <div className="card-header">
        <div className="card-header-icon bg-light-primary text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.39 18.39A5 5 0 0 0 13 11h-.08a2.5 2.5 0 1 0-3.84 0H9a5 5 0 1 0-7.39 7.39l18.78-18.78a1 1 0 0 1 1 1z"></path>
          </svg>
        </div>
        <div className="card-header-titles">
          <h3 className="card-title">Medicine Catalog</h3>
          <p className="card-subtitle">Search and add medications to the prescription list</p>
        </div>
      </div>
      <div className="card-body">
        {/* Search input with search icon */}
        <div className="search-wrapper">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="form-control search-input"
            placeholder="Search by name, form (e.g. Syrup), or strength..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* Medicine list/grid */}
        <div className="medicine-grid-wrapper">
          {filteredMedicines.length > 0 ? (
            <div className="medicine-grid">
              {filteredMedicines.map((med) => (
                <button
                  key={`${med.name}-${med.form}-${med.strength}`}
                  type="button"
                  className="medicine-card-chip"
                  onClick={() => onSelectMedicine(med)}
                >
                  <div className="medicine-chip-info">
                    <span className="medicine-chip-name">{med.name}</span>
                    <div className="medicine-chip-meta">
                      <span className="medicine-chip-form">{med.form}</span>
                      <span className="chip-meta-divider">•</span>
                      <span className="medicine-chip-strength">{med.strength}</span>
                      <span className="chip-meta-divider">•</span>
                      <span className="medicine-chip-dose-per-kg">
                        {med.dosePerKg !== null ? `${med.dosePerKg} mg/kg` : "Fixed"}
                      </span>
                    </div>
                  </div>
                  <div className="medicine-chip-add-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "2rem 1rem" }}>
              <svg className="empty-state-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <p className="empty-state-text">
                {searchQuery
                  ? "No matching medicines found in catalog."
                  : "All available medicines have been selected."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
