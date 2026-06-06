import React from "react";

export interface SavedPrescription {
  rxNumber: string;
  date: string;
  patientName: string;
  patientAge: string;
  patientWeight: number | null;
  doctorName: string;
  selectedMedicines: any[];
  advice: string;
  followUp: string;
  investigations?: string[];
}

interface PrescriptionHistoryProps {
  history: SavedPrescription[];
  onLoad: (prescription: SavedPrescription) => void;
  onDelete: (rxNumber: string) => void;
}

export const PrescriptionHistory: React.FC<PrescriptionHistoryProps> = ({
  history,
  onLoad,
  onDelete
}) => {
  if (history.length === 0) {
    return (
      <div className="medical-card history-card screen-only">
        <div className="card-header">
          <div className="card-header-icon bg-light-primary text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="card-header-titles">
            <h3 className="card-title">Recent Prescriptions</h3>
            <p className="card-subtitle">Local database of recently generated prescriptions</p>
          </div>
        </div>
        <div className="card-body">
          <div className="empty-state">
            <svg className="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <p className="empty-state-text">No saved prescriptions found on this device.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="medical-card history-card screen-only">
      <div className="card-header">
        <div className="card-header-icon bg-light-primary text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="card-header-titles">
          <h3 className="card-title">Recent Prescriptions</h3>
          <p className="card-subtitle">Quickly reload or manage local patient records</p>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="history-list">
          {history.map((rx) => (
            <div key={rx.rxNumber} className="history-item">
              <div className="history-item-details">
                <div className="history-item-header">
                  <span className="history-rx-number font-mono">{rx.rxNumber}</span>
                  <span className="history-date">{rx.date}</span>
                </div>
                <h4 className="history-patient-name">{rx.patientName || "Unnamed Patient"}</h4>
                <div className="history-patient-meta">
                  <span>Age: {rx.patientAge || "N/A"}</span>
                  <span className="bullet-dot"></span>
                  <span>Weight: {rx.patientWeight !== null ? `${rx.patientWeight} kg` : "N/A"}</span>
                  <span className="bullet-dot"></span>
                  <span>Meds: {rx.selectedMedicines.length}</span>
                </div>
                {rx.investigations && rx.investigations.length > 0 && (
                  <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {rx.investigations.map((inv) => (
                      <span
                        key={inv}
                        style={{
                          fontSize: "10px",
                          padding: "2px 7px",
                          borderRadius: "20px",
                          backgroundColor: "rgba(10, 124, 107, 0.08)",
                          color: "var(--primary-dark)",
                          border: "1px solid var(--primary-border)",
                          fontWeight: 500
                        }}
                      >
                        {inv}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="history-item-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onLoad(rx)}
                  title="Load into workspace"
                >
                  Load
                </button>
                <button
                  type="button"
                  className="btn-icon btn-danger-icon"
                  onClick={() => onDelete(rx.rxNumber)}
                  title="Delete prescription"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
