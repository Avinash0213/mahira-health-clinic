export const A4_HEIGHT_PX      = 1122;  // 297mm at 96dpi
export const A4_WIDTH_PX       = 794;   // 210mm at 96dpi
export const PAGE_PADDING_PX   = 24;    // left/right padding inside page
export const HEADER_HEIGHT_PX  = 0;     // header has been removed
export const PATIENT_HEIGHT_PX = 110;    // .page-patient fixed reservation
export const BOTTOM_HEIGHT_PX  = 0;     // bottom (signature + banner + footer) has been removed
export const CONTENT_VPAD_PX   = 16;    // top + bottom padding inside .page-content

export const CONTENT_BUDGET_PX =
  A4_HEIGHT_PX
  - HEADER_HEIGHT_PX
  - PATIENT_HEIGHT_PX
  - BOTTOM_HEIGHT_PX
  - CONTENT_VPAD_PX * 2;

// Fallback row height when DOM measurement is unavailable (SSR / Vitest)
export const FALLBACK_ROW_HEIGHT_PX = 60;
