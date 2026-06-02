import type { SelectedMedicineInstance } from '../components/PrescriptionPreview';

export interface PrescriptionPageData {
  pageNumber: number;        // 1-based
  medicines: SelectedMedicineInstance[];
  showAdvice: boolean;       // true only on last page
  showFollowUp: boolean;     // true only on last page
  globalMedStartIndex: number; // for continuous numbering (e.g. page 2 starts at 13)
}

export function paginatePrescriptionContent(params: {
  medicines: SelectedMedicineInstance[];
  medicineHeights: number[];  // px height of each row, same order as medicines[]
  contentBudgetPx: number;    // CONTENT_BUDGET_PX from constants
  adviceHeight: number;       // px height of rendered advice block, 0 if absent
  followUpHeight: number;     // px height of rendered follow-up block, 0 if absent
}): PrescriptionPageData[] {
  const { medicines, medicineHeights, contentBudgetPx, adviceHeight, followUpHeight } = params;

  // 4. If medicines is empty: return single page with medicines: [],
  //    showAdvice and showFollowUp based on whether advice/followUp exist.
  if (medicines.length === 0) {
    return [
      {
        pageNumber: 1,
        medicines: [],
        showAdvice: adviceHeight > 0,
        showFollowUp: followUpHeight > 0,
        globalMedStartIndex: 0,
      },
    ];
  }

  const pages: PrescriptionPageData[] = [];
  let currentPageMeds: SelectedMedicineInstance[] = [];
  let currentAccumulator = 0;
  let pageNumber = 1;
  let globalMedStartIndex = 0;

  for (let i = 0; i < medicines.length; i++) {
    const med = medicines[i];
    const height = medicineHeights[i] ?? 60; // fallback if height missing

    // When accumulated + medicineHeights[i] > contentBudgetPx:
    // close current page, open new page, reset accumulator.
    // Ensure we always place at least one medicine per page to avoid infinite loops if a single item exceeds the budget.
    if (currentPageMeds.length > 0 && currentAccumulator + height > contentBudgetPx) {
      pages.push({
        pageNumber,
        medicines: currentPageMeds,
        showAdvice: false,
        showFollowUp: false,
        globalMedStartIndex,
      });
      globalMedStartIndex += currentPageMeds.length;
      pageNumber++;
      currentPageMeds = [med];
      currentAccumulator = height;
    } else {
      currentPageMeds.push(med);
      currentAccumulator += height;
    }
  }

  // After all medicines placed: check if adviceHeight + followUpHeight
  // fits in remaining space on last page.
  const remainingSpace = contentBudgetPx - currentAccumulator;
  const totalExtraHeight = adviceHeight + followUpHeight;

  if (remainingSpace >= totalExtraHeight) {
    pages.push({
      pageNumber,
      medicines: currentPageMeds,
      showAdvice: adviceHeight > 0,
      showFollowUp: followUpHeight > 0,
      globalMedStartIndex,
    });
  } else {
    // If no: append a new final page with medicines: [], showAdvice: true, showFollowUp: true.
    pages.push({
      pageNumber,
      medicines: currentPageMeds,
      showAdvice: false,
      showFollowUp: false,
      globalMedStartIndex,
    });
    globalMedStartIndex += currentPageMeds.length;
    pageNumber++;

    pages.push({
      pageNumber,
      medicines: [],
      showAdvice: adviceHeight > 0,
      showFollowUp: followUpHeight > 0,
      globalMedStartIndex,
    });
  }

  return pages;
}
