import React from "react";

export interface Abbreviation {
  code: string;
  latin: string;
  meaning: string;
  timing: string;
}

export const LATIN_ABBREVIATIONS: Abbreviation[] = [
  { code: "OD", latin: "omni die", meaning: "Once Daily", timing: "Every 24 hours, usually morning" },
  { code: "BD", latin: "bis in die", meaning: "Twice Daily", timing: "Every 12 hours, morning and evening" },
  { code: "TDS", latin: "ter die sumendum", meaning: "Three Times Daily", timing: "Every 8 hours, morning, afternoon, and evening" },
  { code: "HS", latin: "hora somni", meaning: "At Bedtime", timing: "Before sleeping at night" },
  { code: "SOS", latin: "si opus sit", meaning: "If Needed", timing: "Only when specific symptoms occur (e.g., pain, fever)" }
];

export const LatinLegend: React.FC = () => {
  return (
    <div className="medical-card latin-legend-card screen-only">
      <div className="card-header">
        <div className="card-header-icon bg-light-primary text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div className="card-header-titles">
          <h3 className="card-title">Prescription Sig Codes</h3>
          <p className="card-subtitle">Latin abbreviations cheat sheet for pediatric dosage frequency</p>
        </div>
      </div>
      <div className="card-body">
        <div className="legend-grid">
          {LATIN_ABBREVIATIONS.map((item) => (
            <div key={item.code} className="legend-item">
              <span className="legend-badge">{item.code}</span>
              <div className="legend-info">
                <div className="legend-meaning">
                  <strong>{item.meaning}</strong>
                  <span className="legend-latin">({item.latin})</span>
                </div>
                <div className="legend-timing">{item.timing}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
