import React, { useState } from "react";

// Comprehensive investigation catalog grouped by category
export interface InvestigationItem {
  name: string;
  category: string;
}

export const INVESTIGATION_CATALOG: InvestigationItem[] = [
  // Hematology
  { name: "CBC", category: "Hematology" },
  { name: "ESR", category: "Hematology" },
  { name: "CRP", category: "Hematology" },
  { name: "Peripheral Smear", category: "Hematology" },
  { name: "Reticulocyte Count", category: "Hematology" },
  { name: "Blood Group & Rh", category: "Hematology" },
  { name: "PT/INR", category: "Hematology" },
  { name: "aPTT", category: "Hematology" },
  { name: "D-Dimer", category: "Hematology" },
  { name: "G6PD", category: "Hematology" },

  // Biochemistry
  { name: "RBS", category: "Biochemistry" },
  { name: "FBS", category: "Biochemistry" },
  { name: "PPBS", category: "Biochemistry" },
  { name: "HbA1c", category: "Biochemistry" },
  { name: "LFT", category: "Biochemistry" },
  { name: "KFT", category: "Biochemistry" },
  { name: "Serum Electrolytes", category: "Biochemistry" },
  { name: "Serum Calcium", category: "Biochemistry" },
  { name: "Serum Magnesium", category: "Biochemistry" },
  { name: "Serum Phosphorus", category: "Biochemistry" },
  { name: "Serum Iron", category: "Biochemistry" },
  { name: "Serum Ferritin", category: "Biochemistry" },
  { name: "TIBC", category: "Biochemistry" },
  { name: "Lipid Profile", category: "Biochemistry" },
  { name: "Serum Uric Acid", category: "Biochemistry" },
  { name: "Serum Amylase", category: "Biochemistry" },
  { name: "Serum Lipase", category: "Biochemistry" },
  { name: "Vitamin D", category: "Biochemistry" },
  { name: "Vitamin B12", category: "Biochemistry" },
  { name: "Folate", category: "Biochemistry" },

  // Thyroid & Hormones
  { name: "Thyroid Profile", category: "Hormones" },
  { name: "TSH", category: "Hormones" },
  { name: "Free T3", category: "Hormones" },
  { name: "Free T4", category: "Hormones" },

  // Microbiology & Serology
  { name: "Blood Culture", category: "Microbiology" },
  { name: "Urine C/S", category: "Microbiology" },
  { name: "Stool C/S", category: "Microbiology" },
  { name: "Throat Swab C/S", category: "Microbiology" },
  { name: "Widal Test", category: "Serology" },
  { name: "Dengue NS1", category: "Serology" },
  { name: "Dengue IgM/IgG", category: "Serology" },
  { name: "Malaria Card", category: "Serology" },
  { name: "Malaria Smear", category: "Serology" },
  { name: "Typhidot", category: "Serology" },
  { name: "ASO Titre", category: "Serology" },
  { name: "RA Factor", category: "Serology" },
  { name: "Mantoux Test", category: "Serology" },
  { name: "HIV", category: "Serology" },
  { name: "HBsAg", category: "Serology" },

  // Urine & Stool
  { name: "Urine R/E", category: "Urine & Stool" },
  { name: "Stool R/E", category: "Urine & Stool" },
  { name: "Stool Occult Blood", category: "Urine & Stool" },
  { name: "24hr Urine Protein", category: "Urine & Stool" },
  { name: "Urine Microalbumin", category: "Urine & Stool" },

  // Radiology
  { name: "Chest X-Ray", category: "Radiology" },
  { name: "X-Ray Abdomen", category: "Radiology" },
  { name: "X-Ray Spine", category: "Radiology" },
  { name: "X-Ray Extremity", category: "Radiology" },
  { name: "USG Abdomen", category: "Radiology" },
  { name: "USG KUB", category: "Radiology" },
  { name: "USG Pelvis", category: "Radiology" },
  { name: "CT Scan", category: "Radiology" },
  { name: "MRI", category: "Radiology" },
  { name: "ECHO", category: "Radiology" },
  { name: "ECG", category: "Radiology" },
];

// Extract unique categories for filter chips
const ALL_CATEGORIES = Array.from(new Set(INVESTIGATION_CATALOG.map((i) => i.category)));

interface InvestigationSelectorProps {
  selectedInvestigations: string[];
  onToggleInvestigation: (name: string) => void;
  onAddCustomInvestigation: (name: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const InvestigationSelector: React.FC<InvestigationSelectorProps> = ({
  selectedInvestigations,
  onToggleInvestigation,
  onAddCustomInvestigation,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState("");

  // Filter investigations based on search and category
  const filteredInvestigations = INVESTIGATION_CATALOG.filter((inv) => {
    // Filter by category
    if (activeCategory && inv.category !== activeCategory) return false;

    // Filter by search
    const query = searchQuery.toLowerCase();
    return (
      inv.name.toLowerCase().includes(query) ||
      inv.category.toLowerCase().includes(query)
    );
  });

  const handleAddCustom = () => {
    const val = customInput.trim();
    if (val && !selectedInvestigations.includes(val)) {
      onAddCustomInvestigation(val);
    }
    setCustomInput("");
  };

  return (
    <div className="medical-card investigation-selector-card screen-only" id="section-investigations">
      <div
        className="card-header"
        style={{ cursor: onToggleCollapse ? "pointer" : "default" }}
        onClick={onToggleCollapse}
      >
        <div className="card-header-icon bg-light-primary text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"></path>
          </svg>
        </div>
        <div className="card-header-titles">
          <h3 className="card-title">Investigations Catalog</h3>
          <p className="card-subtitle">Search and order lab tests & imaging for this visit</p>
        </div>
        {selectedInvestigations.length > 0 && (
          <span
            style={{
              marginLeft: "auto",
              marginRight: "8px",
              backgroundColor: "var(--primary)",
              color: "var(--white)",
              borderRadius: "20px",
              padding: "2px 10px",
              fontSize: "12px",
              fontWeight: 700
            }}
          >
            {selectedInvestigations.length} ordered
          </span>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)", padding: "4px" }}
            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        )}
      </div>
      {!isCollapsed && (
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
              placeholder="Search by test name or category (e.g. CBC, Radiology)..."
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

          {/* Category filter chips */}
          <div className="investigation-category-filters">
            <button
              type="button"
              className={`category-filter-chip ${activeCategory === null ? "active" : ""}`}
              onClick={() => setActiveCategory(null)}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-filter-chip ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Investigation grid */}
          <div className="medicine-grid-wrapper">
            {filteredInvestigations.length > 0 ? (
              <div className="medicine-grid">
                {filteredInvestigations.map((inv) => {
                  const isSelected = selectedInvestigations.includes(inv.name);
                  return (
                    <button
                      key={inv.name}
                      type="button"
                      className={`medicine-card-chip ${isSelected ? "investigation-chip-selected" : ""}`}
                      onClick={() => onToggleInvestigation(inv.name)}
                    >
                      <div className="medicine-chip-info">
                        <span className="medicine-chip-name">{inv.name}</span>
                        <div className="medicine-chip-meta">
                          <span className="medicine-chip-form">{inv.category}</span>
                        </div>
                      </div>
                      <div className="medicine-chip-add-icon">
                        {isSelected ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "2rem 1rem" }}>
                <svg className="empty-state-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p className="empty-state-text">
                  No matching investigations found.
                </p>
              </div>
            )}
          </div>

          {/* Custom investigation input */}
          <div className="investigation-custom-input-row">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Add custom investigation (e.g. Serum Ferritin)..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom();
                }
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ whiteSpace: "nowrap", height: "36px", padding: "0 16px" }}
              onClick={handleAddCustom}
              disabled={!customInput.trim()}
            >
              + Add
            </button>
          </div>

          {/* Ordered investigations tag list */}
          {selectedInvestigations.length > 0 ? (
            <div className="investigation-ordered-section">
              <div className="investigation-ordered-label">Ordered ({selectedInvestigations.length})</div>
              <div className="investigation-ordered-tags">
                {selectedInvestigations.map((inv) => (
                  <span key={inv} className="investigation-ordered-tag">
                    {inv}
                    <button
                      type="button"
                      onClick={() => onToggleInvestigation(inv)}
                      className="investigation-tag-remove"
                      title="Remove"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "12px 0" }}>
              <p className="empty-state-text" style={{ fontSize: "12.5px" }}>No investigations ordered yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
