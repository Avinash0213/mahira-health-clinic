import React from "react";
import { calculateDose } from "../utils/doseCalculator";

export interface SelectedMedicineInstance {
  id: string;
  name: string;
  form: string;
  strength: string;
  dosePerKg: number | null;
  unit: string;
  maxDose: number | null;
  frequency: string;
  duration: string;
  overrideDose: number | null;
  instructions: string;
}

interface PrescriptionPreviewProps {
  rxNumber: string;
  currentDate: string;
  patientName: string;
  patientAge: string;
  patientWeight: number | null;
  doctorName: string;
  selectedMedicines: SelectedMedicineInstance[];
  advice: string;
  followUp: string;
  onClearAll: () => void;
  onPrint: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  OD: "Once Daily",
  BD: "Twice Daily",
  TDS: "Three Times Daily",
  HS: "At Bedtime",
  SOS: "If Needed"
};

export const PrescriptionPreview: React.FC<PrescriptionPreviewProps> = ({
  rxNumber,
  currentDate,
  patientName,
  patientAge,
  patientWeight,
  doctorName,
  selectedMedicines,
  advice,
  followUp,
  onClearAll,
  onPrint
}) => {
  return (
    <div className="preview-sticky-wrapper screen-only">
      <div className="medical-card preview-card">
        {/* Preview Titlebar */}
        <div className="preview-titlebar">
          <span className="live-badge">
            <span className="live-dot"></span>
            LIVE PREVIEW
          </span>
          <span className="preview-file-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
        </div>

        {/* Prescription Canvas */}
        <div className="prescription-canvas">
          {/* Rx Document Header */}
          <div className="canvas-header">
            <div className="canvas-clinic-info">
              <h2 className="canvas-clinic-name font-display">Mahira Health Clinic</h2>
              <p className="canvas-clinic-sub">PEDIATRIC CARE SYSTEM</p>
            </div>
            <div className="canvas-rx-meta">
              <div className="canvas-rx-num">
                <span className="meta-label">Rx No:</span>
                <span className="font-mono text-dark">{rxNumber}</span>
              </div>
              <div className="canvas-rx-date">
                <span className="meta-label">Date:</span>
                <span className="text-dark">{currentDate}</span>
              </div>
            </div>
          </div>

          {/* Rx Patient Details */}
          <div className="canvas-patient-info">
            <div className="canvas-info-row">
              <div className="canvas-info-cell">
                <span className="meta-label">PATIENT NAME</span>
                <span className="meta-value font-medium text-dark">
                  {patientName || <span className="text-placeholder">Enter Name</span>}
                </span>
              </div>
              <div className="canvas-info-cell">
                <span className="meta-label">AGE</span>
                <span className="meta-value text-dark">
                  {patientAge || <span className="text-placeholder">Enter Age</span>}
                </span>
              </div>
              <div className="canvas-info-cell">
                <span className="meta-label">WEIGHT</span>
                <span className="meta-value text-dark">
                  {patientWeight !== null && patientWeight > 0 ? (
                    `${patientWeight} kg`
                  ) : (
                    <span className="text-placeholder">Enter Weight</span>
                  )}
                </span>
              </div>
            </div>
            {doctorName && (
              <div className="canvas-doctor-row">
                <span className="meta-label">PEDIATRICIAN</span>
                <span className="meta-value font-medium text-dark">Dr. {doctorName}</span>
              </div>
            )}
          </div>

          {/* Rx Symbol & Body */}
          <div className="canvas-body">
            <div className="rx-symbol font-display text-primary">Rx</div>

            {selectedMedicines.length > 0 ? (
              <div className="canvas-med-list">
                {selectedMedicines.map((med, idx) => {
                  // Re-calculate dosage based on current weight/override
                  const calc = calculateDose(med, patientWeight, med.overrideDose);
                  return (
                    <div key={med.id} className="canvas-med-item">
                      <div className="canvas-med-header">
                        <span className="canvas-med-number">{idx + 1}.</span>
                        <div className="canvas-med-details">
                          <span className="canvas-med-name font-medium text-dark">{med.name}</span>
                          <span className="canvas-med-spec">
                            {med.form} &middot; {med.strength} &middot; {med.dosePerKg !== null ? `${med.dosePerKg} mg/kg` : "Fixed Dose"}
                          </span>
                        </div>
                      </div>
                      <div className="canvas-med-schedule">
                        <div className="canvas-schedule-item">
                          <span className="schedule-lbl">Dose:</span>
                          <span className="schedule-val font-semibold text-primary">{calc.doseText}</span>
                        </div>
                        <div className="canvas-schedule-item">
                          <span className="schedule-lbl">Sig:</span>
                          <span className="schedule-val text-dark">
                            {med.frequency} &mdash; {FREQUENCY_LABELS[med.frequency]}
                          </span>
                        </div>
                        {med.duration && (
                          <div className="canvas-schedule-item">
                            <span className="schedule-lbl">For:</span>
                            <span className="schedule-val text-dark">{med.duration}</span>
                          </div>
                        )}
                        {med.instructions && (
                          <div className="canvas-med-instructions text-muted">
                            <span className="instructions-icon">&deg;</span>
                            {med.instructions}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="canvas-empty-state">
                <div className="rx-outline-symbol">Rx</div>
                <p className="canvas-empty-text">No medications selected yet</p>
                <p className="canvas-empty-sub">Use the catalog on the left to add medicines</p>
              </div>
            )}

            {/* Advice Section */}
            {advice && (
              <div className="canvas-section-box">
                <span className="canvas-section-title">ADVICE & INSTRUCTIONS</span>
                <p className="canvas-section-content">{advice}</p>
              </div>
            )}

            {/* Follow-up Section */}
            {followUp && (
              <div className="canvas-section-box">
                <span className="canvas-section-title">FOLLOW-UP</span>
                <p className="canvas-section-content font-medium text-dark">{followUp}</p>
              </div>
            )}
          </div>

          {/* Rx Document Footer */}
          <div className="canvas-footer">
            <p className="canvas-disclaimer">
              This prescription is valid for one-time dispensing only. Kindly consult the doctor before making any change in medication.
            </p>
            <div className="canvas-signatures">
              <span className="canvas-clinic-footer">Mahira Health Clinic</span>
              <div className="canvas-sig-line">
                <div className="sig-placeholder">Doctor Signature</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="preview-actions">
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={onClearAll}
          >
            Clear All
          </button>
          <button
            type="button"
            className="btn btn-primary flex-2 btn-print-trigger"
            onClick={onPrint}
            disabled={selectedMedicines.length === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "6px" }}>
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Prescription
          </button>
        </div>
      </div>
    </div>
  );
};
