import React from "react";
import { calculateDose } from "../utils/doseCalculator";
import type { PrescriptionPageData } from "../utils/paginatePrescriptionContent";

interface PrescriptionPageProps {
  // Patient & session data
  rxNumber: string;
  currentDate: string;
  patientName: string;
  patientAge: string;
  patientWeight: number | null;
  doctorName: string;
  patientGender?: string;
  patientPhone?: string;
  patientCode?: string;
  // Per-page content
  pageData: PrescriptionPageData;
  totalPages: number;
  // Full prescription data needed for advice/followup/investigations
  advice: string;
  followUp: string;
  investigations?: string[];
  // Render context
  isPreview?: boolean;   // true = screen preview (scaled down), false = print size
}

const FREQUENCY_LABELS: Record<string, string> = {
  OD: "Once Daily",
  BD: "Twice Daily",
  TDS: "Three Times Daily",
  HS: "At Bedtime",
  SOS: "If Needed"
};

export const PrescriptionPage: React.FC<PrescriptionPageProps> = ({
  rxNumber: _rxNumber,
  currentDate,
  patientName,
  patientAge,
  patientWeight,
  doctorName: _doctorName,
  patientGender,
  patientPhone: _patientPhone,
  patientCode,
  pageData,
  totalPages: _totalPages,
  advice,
  followUp,
  investigations = [],
  isPreview = false,
}) => {
  return (
    <div className="print-page">


      {/* ── PATIENT DETAILS ── */}
      <div className="page-patient">
        {/* Row 1 */}
        <div className="patient-row">
          <div className="patient-col">
            <span className="patient-label">Patient:</span>
            <span className="patient-value">
              {patientName || (isPreview ? <span className="text-placeholder">Enter Name</span> : "—")}
            </span>
          </div>
          <div className="patient-col">
            <span className="patient-label">Date:</span>
            <span className="patient-value">
              {currentDate || "—"}
            </span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="patient-row">
          <div className="patient-col">
            <span className="patient-label">Age/Sex:</span>
            <span className="patient-value">
              {patientAge || (isPreview ? <span className="text-placeholder">Enter Age</span> : "—")}
              {patientGender ? ` / ${patientGender}` : ""}
            </span>
          </div>
          <div className="patient-col">
            <span className="patient-label">Weight:</span>
            <span className="patient-value">
              {patientWeight !== null && patientWeight > 0 ? (
                `${patientWeight} kg`
              ) : (
                isPreview ? <span className="text-placeholder">Enter Weight</span> : "—"
              )}
            </span>
          </div>
        </div>

        {/* Row 3 */}
        <div className="patient-row">
          <div className="patient-col">
            <span className="patient-label">Patient ID:</span>
            <span className="patient-value">
              {patientCode || (isPreview ? <span className="text-placeholder">Enter ID</span> : "—")}
            </span>
          </div>
        </div>
      </div>

      {/* ── BODY: watermark + medicines ── */}
      <div className="page-body">
        {pageData.pageNumber === 1 && (
          <div className="first-page-findings-space" style={{
            height: "420px",
            borderBottom: "1.5px dashed var(--border)",
            padding: "12px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            color: "var(--muted)",
            boxSizing: "border-box",
            position: "relative",
            zIndex: 1
          }}>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--primary)" }}>Doctor's Findings / Notes</span>
          </div>
        )}

        {/* Content: z-index: 1, position: relative */}
        <div className="page-content">
          {pageData.pageNumber === 1 && <div className="rx-symbol">Rx</div>}

          {pageData.medicines.map((med, localIdx) => {
            const globalIdx = pageData.globalMedStartIndex + localIdx;
            const calc = calculateDose(med, patientWeight, med.overrideDose);
            
            let displayedDose = calc.doseText;
            if (!isPreview && med.overrideDose === null && med.dosePerKg === null) {
              displayedDose = "As Directed";
            }

            return (
              <div key={med.id} className="rx-med-row">
                <div className="canvas-med-header">
                  <span className="canvas-med-number">{globalIdx + 1}.</span>
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
                    <span className="schedule-val font-semibold text-primary">{displayedDose}</span>
                  </div>
                  <div className="canvas-schedule-item">
                    <span className="schedule-lbl">Sig:</span>
                    <span className="schedule-val text-dark">
                      {med.frequency} &mdash; {FREQUENCY_LABELS[med.frequency] || med.frequency}
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

          {pageData.showAdvice && investigations.length > 0 && (
            <div className="canvas-section-box">
              <span className="canvas-section-title">INVESTIGATIONS</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "3px" }}>
                {investigations.map((inv, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      padding: isPreview ? "1px 6px" : "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid var(--primary-border, #a7d7cf)",
                      backgroundColor: "rgba(10,124,107,0.06)",
                      color: "var(--primary-dark, #0a5c52)",
                      fontSize: isPreview ? "8px" : "9.5px",
                      fontWeight: 600
                    }}
                  >
                    {inv}
                  </span>
                ))}
              </div>
            </div>
          )}

          {pageData.showAdvice && advice && (
            <div className="canvas-section-box">
              <span className="canvas-section-title">ADVICE &amp; INSTRUCTIONS</span>
              <p className="canvas-section-content">{advice}</p>
            </div>
          )}

          {pageData.showFollowUp && followUp && (
            <div className="canvas-section-box">
              <span className="canvas-section-title">FOLLOW-UP</span>
              <p className="canvas-section-content font-medium text-dark">{followUp}</p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
};
