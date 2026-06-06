import { describe, it, expect } from 'vitest';
import { paginatePrescriptionContent } from './paginatePrescriptionContent';
import type { SelectedMedicineInstance } from '../components/PrescriptionPreview';

const createMockMed = (id: string): SelectedMedicineInstance => ({
  id,
  name: `Med ${id}`,
  form: 'Syrup',
  strength: '125mg/5ml',
  dosePerKg: 25,
  unit: 'mg',
  maxDose: 500,
  frequency: 'BD',
  duration: '5 days',
  overrideDose: null,
  instructions: 'After meals'
});

describe('paginatePrescriptionContent', () => {
  it('0 medicines, no advice', () => {
    const result = paginatePrescriptionContent({
      medicines: [],
      medicineHeights: [],
      contentBudgetPx: 200,
      adviceHeight: 0,
      followUpHeight: 0,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(1);
    expect(result[0].medicines).toHaveLength(0);
    expect(result[0].showAdvice).toBe(false);
    expect(result[0].showFollowUp).toBe(false);
  });

  it('0 medicines, with advice', () => {
    const result = paginatePrescriptionContent({
      medicines: [],
      medicineHeights: [],
      contentBudgetPx: 200,
      adviceHeight: 50,
      followUpHeight: 0,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(1);
    expect(result[0].medicines).toHaveLength(0);
    expect(result[0].showAdvice).toBe(true);
    expect(result[0].showFollowUp).toBe(false);
  });

  it('1 medicine that fits', () => {
    const medicines = [createMockMed('1')];
    const result = paginatePrescriptionContent({
      medicines,
      medicineHeights: [60],
      contentBudgetPx: 620,
      adviceHeight: 50,
      followUpHeight: 30,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(1);
    expect(result[0].medicines).toHaveLength(1);
    expect(result[0].showAdvice).toBe(true);
    expect(result[0].showFollowUp).toBe(true);
    expect(result[0].globalMedStartIndex).toBe(0);
  });

  it('medicines that exactly fill 1 page', () => {
    const medicines = [createMockMed('1'), createMockMed('2'), createMockMed('3')];
    const result = paginatePrescriptionContent({
      medicines,
      medicineHeights: [60, 60, 80],
      contentBudgetPx: 620,
      adviceHeight: 0,
      followUpHeight: 0,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(1);
    expect(result[0].medicines).toHaveLength(3);
    expect(result[0].showAdvice).toBe(false);
    expect(result[0].showFollowUp).toBe(false);
  });

  it('medicines that overflow to page 2', () => {
    const medicines = [createMockMed('1'), createMockMed('2'), createMockMed('3')];
    const result = paginatePrescriptionContent({
      medicines,
      medicineHeights: [60, 80, 70],
      contentBudgetPx: 620,
      adviceHeight: 0,
      followUpHeight: 0,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(2);
    expect(result[0].medicines).toHaveLength(2);
    expect(result[0].globalMedStartIndex).toBe(0);
    expect(result[1].medicines).toHaveLength(1);
    expect(result[1].globalMedStartIndex).toBe(2);
  });

  it('advice that fits on last page', () => {
    const medicines = [createMockMed('1'), createMockMed('2')];
    const result = paginatePrescriptionContent({
      medicines,
      medicineHeights: [60, 60],
      contentBudgetPx: 620,
      adviceHeight: 50,
      followUpHeight: 30,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(1);
    expect(result[0].medicines).toHaveLength(2);
    expect(result[0].showAdvice).toBe(true);
    expect(result[0].showFollowUp).toBe(true);
  });

  it('advice that does NOT fit — triggers extra page', () => {
    const medicines = [createMockMed('1'), createMockMed('2')];
    const result = paginatePrescriptionContent({
      medicines,
      medicineHeights: [60, 60],
      contentBudgetPx: 620,
      adviceHeight: 50,
      followUpHeight: 31,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(2);
    expect(result[0].medicines).toHaveLength(2);
    expect(result[0].showAdvice).toBe(false);
    expect(result[0].showFollowUp).toBe(false);
    expect(result[1].medicines).toHaveLength(0);
    expect(result[1].showAdvice).toBe(true);
    expect(result[1].showFollowUp).toBe(true);
    expect(result[1].globalMedStartIndex).toBe(2);
  });

  it('100 medicines with uniform 60px height', () => {
    const medicines = Array.from({ length: 100 }, (_, i) => createMockMed(String(i)));
    const heights = Array.from({ length: 100 }, () => 60);
    const result = paginatePrescriptionContent({
      medicines,
      medicineHeights: heights,
      contentBudgetPx: 620,
      adviceHeight: 10,
      followUpHeight: 0,
      investigationsHeight: 0
    });
    expect(result).toHaveLength(34);
    expect(result[0].medicines).toHaveLength(3);
    expect(result[33].medicines).toHaveLength(1);
    expect(result[33].showAdvice).toBe(true);
    expect(result[33].globalMedStartIndex).toBe(99);
  });
});
