import React from "react";
import { PrescriptionPage } from "./PrescriptionPage";
import type { PrescriptionPageData } from "../utils/paginatePrescriptionContent";

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
  pages: PrescriptionPageData[];
  isMeasuring: boolean;
}

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
  onPrint,
  pages,
  isMeasuring
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
        <div className="preview-pages-container">
          {isMeasuring && (
            <div className="preview-measuring-overlay">
              <div 
                style={{ 
                  border: "2.5px solid #d6e4e0",
                  borderTop: "2.5px solid var(--primary)",
                  borderRadius: "50%",
                  width: "18px",
                  height: "18px",
                  animation: "spin 0.8s linear infinite",
                  marginRight: "8px"
                }}
              />
              <span>Measuring layout...</span>
            </div>
          )}
          {pages.map((pageData) => (
            <PrescriptionPage
              key={pageData.pageNumber}
              rxNumber={rxNumber}
              currentDate={currentDate}
              patientName={patientName}
              patientAge={patientAge}
              patientWeight={patientWeight}
              doctorName={doctorName}
              pageData={pageData}
              totalPages={pages.length}
              advice={advice}
              followUp={followUp}
              isPreview={true}
            />
          ))}
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
            disabled={selectedMedicines.length === 0 || isMeasuring}
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
