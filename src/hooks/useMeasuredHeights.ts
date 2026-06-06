import { useState, useEffect } from "react";
import type { SelectedMedicineInstance } from "../components/PrescriptionPreview";
import { FALLBACK_ROW_HEIGHT_PX } from "../utils/prescriptionConstants";
import { calculateDose } from "../utils/doseCalculator";

const FREQUENCY_LABELS: Record<string, string> = {
  OD: "Once Daily",
  BD: "Twice Daily",
  TDS: "Three Times Daily",
  HS: "At Bedtime",
  SOS: "If Needed"
};

export function useMeasuredHeights(
  medicines: SelectedMedicineInstance[],
  advice: string,
  followUp: string,
  investigations: string[],
  contentWidthPx: number,
  patientWeight: number | null
): {
  medicineHeights: number[];
  adviceHeight: number;
  followUpHeight: number;
  investigationsHeight: number;
  isMeasuring: boolean;
} {
  const [state, setState] = useState<{
    medicineHeights: number[];
    adviceHeight: number;
    followUpHeight: number;
    investigationsHeight: number;
    isMeasuring: boolean;
  }>({
    medicineHeights: [],
    adviceHeight: 0,
    followUpHeight: 0,
    investigationsHeight: 0,
    isMeasuring: false
  });

  const [resizeTrigger, setResizeTrigger] = useState(0);

  // Debounced window resize listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: any = null;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setResizeTrigger(prev => prev + 1);
      }, 300);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Measurement logic
  useEffect(() => {
    // 6. SSR / window undefined guard: return FALLBACK_ROW_HEIGHT_PX for each row.
    if (typeof window === "undefined") {
      setState({
        medicineHeights: medicines.map(() => FALLBACK_ROW_HEIGHT_PX),
        adviceHeight: advice ? FALLBACK_ROW_HEIGHT_PX : 0,
        followUpHeight: followUp ? FALLBACK_ROW_HEIGHT_PX : 0,
        investigationsHeight: investigations && investigations.length > 0 ? FALLBACK_ROW_HEIGHT_PX : 0,
        isMeasuring: false
      });
      return;
    }

    // Set isMeasuring: true first
    setState(prev => ({ ...prev, isMeasuring: true }));

    let active = true;

    // Use requestAnimationFrame to measure after layout/paint styles are loaded
    const frameId = requestAnimationFrame(() => {
      if (!active) return;

      // 2. Render all medicine rows into a hidden off-screen container
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.visibility = "hidden";
      container.style.width = `${contentWidthPx}px`;
      
      // The container must use the same class tree so style scoping works
      document.body.appendChild(container);

      // Render medicines
      const rowElements = medicines.map((med) => {
        const row = document.createElement("div");
        row.className = "rx-med-row";
        
        const calc = calculateDose(med, patientWeight, med.overrideDose);
        
        row.innerHTML = `
          <div class="canvas-med-header">
            <span class="canvas-med-number">1.</span>
            <div class="canvas-med-details">
              <span class="canvas-med-name font-medium text-dark">${med.name || ""}</span>
              <span class="canvas-med-spec">
                ${med.form || ""} &middot; ${med.strength || ""} &middot; ${med.dosePerKg !== null ? `${med.dosePerKg} mg/kg` : "Fixed Dose"}
              </span>
            </div>
          </div>
          <div class="canvas-med-schedule">
            <div class="canvas-schedule-item">
              <span class="schedule-lbl">Dose:</span>
              <span class="schedule-val font-semibold text-primary">${calc.doseText || ""}</span>
            </div>
            <div class="canvas-schedule-item">
              <span class="schedule-lbl">Sig:</span>
              <span class="schedule-val text-dark">${med.frequency || ""} &mdash; ${FREQUENCY_LABELS[med.frequency] || med.frequency || ""}</span>
            </div>
            ${med.duration ? `
              <div class="canvas-schedule-item">
                <span class="schedule-lbl">For:</span>
                <span class="schedule-val text-dark">${med.duration}</span>
              </div>
            ` : ""}
            ${med.instructions ? `
              <div class="canvas-med-instructions text-muted">
                <span class="instructions-icon">&deg;</span>
                ${med.instructions}
              </div>
            ` : ""}
          </div>
        `;
        
        container.appendChild(row);
        return row;
      });

      // Render Advice block
      let adviceEl: HTMLDivElement | null = null;
      if (advice) {
        adviceEl = document.createElement("div");
        adviceEl.className = "canvas-section-box";
        adviceEl.innerHTML = `
          <span class="canvas-section-title">ADVICE & INSTRUCTIONS</span>
          <p class="canvas-section-content">${advice}</p>
        `;
        container.appendChild(adviceEl);
      }

      // Render Follow-up block
      let followUpEl: HTMLDivElement | null = null;
      if (followUp) {
        followUpEl = document.createElement("div");
        followUpEl.className = "canvas-section-box";
        followUpEl.innerHTML = `
          <span class="canvas-section-title">FOLLOW-UP</span>
          <p class="canvas-section-content font-medium text-dark">${followUp}</p>
        `;
        container.appendChild(followUpEl);
      }

      // Render Investigations block
      let investigationsEl: HTMLDivElement | null = null;
      if (investigations && investigations.length > 0) {
        investigationsEl = document.createElement("div");
        investigationsEl.className = "canvas-section-box";
        investigationsEl.innerHTML = `
          <span class="canvas-section-title">INVESTIGATIONS</span>
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 3px;">
            ${investigations.map(inv => `
              <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; border: 1px solid var(--primary-border, #a7d7cf); background-color: rgba(10,124,107,0.06); color: var(--primary-dark, #0a5c52); font-size: 9.5px; font-weight: 600;">
                ${inv}
              </span>
            `).join('')}
          </div>
        `;
        container.appendChild(investigationsEl);
      }

      // Measure
      const medicineHeights = rowElements.map(el => el.getBoundingClientRect().height);
      const adviceHeight = adviceEl ? adviceEl.getBoundingClientRect().height : 0;
      const followUpHeight = followUpEl ? followUpEl.getBoundingClientRect().height : 0;
      const investigationsHeight = investigationsEl ? investigationsEl.getBoundingClientRect().height : 0;

      // Cleanup DOM
      document.body.removeChild(container);

      setState({
        medicineHeights,
        adviceHeight,
        followUpHeight,
        investigationsHeight,
        isMeasuring: false
      });
    });

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
    };
  }, [medicines, advice, followUp, investigations, contentWidthPx, patientWeight, resizeTrigger]);

  return state;
}
