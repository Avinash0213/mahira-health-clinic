import React from "react";
import { calculateDose } from "../utils/doseCalculator";
import { MahiraLogo } from "./MahiraLogo";
import type { PrescriptionPageData } from "../utils/paginatePrescriptionContent";

interface PrescriptionPageProps {
  // Patient & session data
  rxNumber: string;
  currentDate: string;
  patientName: string;
  patientAge: string;
  patientWeight: number | null;
  doctorName: string;
  // Per-page content
  pageData: PrescriptionPageData;
  totalPages: number;
  // Full prescription data needed for advice/followup
  advice: string;
  followUp: string;
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
  rxNumber,
  currentDate,
  patientName,
  patientAge,
  patientWeight,
  doctorName,
  pageData,
  totalPages,
  advice,
  followUp,
  isPreview = false
}) => {
  return (
    <div className="print-page">
      {/* ── HEADER ── never position:fixed, always static */}
      <div className="page-header">
        <div className="letterhead-header">
          <MahiraLogo size={isPreview ? 56 : 80} />
          <div className="letterhead-title-container">
            <span className="letterhead-brand-mahira">Mahira</span>
            <div className="letterhead-right-group">
              <span className="letterhead-brand-healthcare">Health Care</span>
              <div className="letterhead-underline-row">
                <div className="letterhead-line"></div>
                <span className="letterhead-tagline">We Care For You</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PATIENT DETAILS ── */}
      <div className="page-patient">
        <div className="letterhead-patient-info">
          <div className="letterhead-patient-grid">
            <div className="letterhead-patient-cell">
              <span className="letterhead-patient-label">Patient Name</span>
              <span className="letterhead-patient-value">
                {patientName || (isPreview ? <span className="text-placeholder">Enter Name</span> : "—")}
              </span>
            </div>
            <div className="letterhead-patient-cell">
              <span className="letterhead-patient-label">Age</span>
              <span className="letterhead-patient-value">
                {patientAge || (isPreview ? <span className="text-placeholder">Enter Age</span> : "—")}
              </span>
            </div>
            <div className="letterhead-patient-cell">
              <span className="letterhead-patient-label">Weight</span>
              <span className="letterhead-patient-value">
                {patientWeight !== null && patientWeight > 0 ? (
                  `${patientWeight} kg`
                ) : (
                  isPreview ? <span className="text-placeholder">Enter Weight</span> : "—"
                )}
              </span>
            </div>
          </div>
          
          <div className="letterhead-doctor-row font-mono text-muted" style={{ fontSize: isPreview ? "9px" : "10.5px" }}>
            <div>
              <strong>Rx No:</strong> <span className="text-dark font-medium">{rxNumber}</span>
            </div>
            <div>
              <strong>Date:</strong> <span className="text-dark font-medium">{currentDate}</span>
            </div>
            {doctorName && (
              <div>
                <strong>Pediatrician:</strong> <span className="text-dark font-medium">Dr. {doctorName}</span>
              </div>
            )}
            <div style={{ marginLeft: "auto" }}>
              <strong>Page:</strong> <span className="text-dark font-medium">{pageData.pageNumber} / {totalPages}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY: watermark + medicines ── */}
      <div className="page-body">
        {/* Watermark: absolute within page-body, NOT fixed */}
        <div className="page-watermark">
          <MahiraLogo size={isPreview ? 220 : 340} />
        </div>

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

          {pageData.showAdvice && advice && (
            <div className="canvas-section-box">
              <span className="canvas-section-title">ADVICE & INSTRUCTIONS</span>
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

      {/* ── BOTTOM UNIT: pushed to page bottom via margin-top: auto ── */}
      <div className="page-bottom">
        <div className="page-signature">
          <div className="letterhead-sig-container">
            <div className="letterhead-sig-box">
              <div className="letterhead-sig-line"></div>
              <div className="letterhead-sig-label">Doctor Signature</div>
              <div className="letterhead-sig-stamp">Stamp & Seal</div>
            </div>
          </div>
        </div>
        {/* BANNER — sits directly above footer, no negative margin */}
        <div className="letterhead-pill-banner">
          <span className="letterhead-pill-validity">
            (Prescription Valid For Only 3 Days)
          </span>
          <span className="letterhead-pill-appointment">
            For Appointment Call On : 0120-2978933
          </span>
        </div>

        {/* FOOTER STRIP */}
        <div className="letterhead-footer">
          <div className="letterhead-footer-content">

            {/* LEFT: address + email + legal note stacked */}
            <div className="letterhead-footer-left">
              <div className="letterhead-footer-item">
                <span className="letterhead-footer-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </span>
                <span>
                  Arya Nagar, Behind Indian Petrol Pump,<br />
                  Railway Road, Dadri, Greater Noida, G.B. Nagar (U.P.)
                </span>
              </div>
              <div className="letterhead-footer-item">
                <span className="letterhead-footer-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </span>
                <span>Email: mahirahealthcare2025@gmail.com</span>
              </div>
            </div>

            {/* RIGHT: OPD timings + Sunday badge */}
            <div className="letterhead-footer-right">
              <div className="letterhead-opd-title">OPD TIMING:-</div>
              <div className="letterhead-opd-time">
                Morning 8:00 am to 3:00 pm (Monday to Saturday)
              </div>
              <div className="letterhead-opd-time">
                Evening 8:00 pm to 10:00 pm (Monday to Saturday)
              </div>
              <div className="letterhead-opd-closed">
                Sunday - Evening Closed
              </div>
            </div>

          </div>
          <div className="letterhead-legal-note">
            (Not Valid for any Medico-legal purpose)
          </div>
        </div>
      </div>
    </div>
  );
};
