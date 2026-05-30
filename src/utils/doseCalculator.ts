export interface Medicine {
  name: string;
  form: string;
  strength: string;
  dosePerKg: number | null;
  unit: string;
  maxDose: number | null;
}

export const MEDICINE_DATASET: Medicine[] = [
  { name: "Amoxicillin", form: "Syrup", strength: "125mg/5ml", dosePerKg: 25, unit: "mg", maxDose: 500 },
  { name: "Paracetamol", form: "Suspension", strength: "120mg/5ml", dosePerKg: 15, unit: "mg", maxDose: 500 },
  { name: "Ibuprofen", form: "Suspension", strength: "100mg/5ml", dosePerKg: 10, unit: "mg", maxDose: 400 },
  { name: "Cetirizine", form: "Syrup", strength: "5mg/5ml", dosePerKg: 0.25, unit: "mg", maxDose: 10 },
  { name: "Azithromycin", form: "Suspension", strength: "200mg/5ml", dosePerKg: 10, unit: "mg", maxDose: 500 },
  { name: "Salbutamol", form: "Syrup", strength: "2mg/5ml", dosePerKg: 0.1, unit: "mg", maxDose: 4 },
  { name: "Zinc Sulfate", form: "Dispersible Tablet", strength: "20mg", dosePerKg: null, unit: "tab", maxDose: null },
  { name: "Domperidone", form: "Suspension", strength: "1mg/ml", dosePerKg: 0.25, unit: "mg", maxDose: 10 },
  { name: "Ondansetron", form: "Syrup", strength: "2mg/5ml", dosePerKg: 0.1, unit: "mg", maxDose: 4 },
  { name: "Montelukast", form: "Chewable Tablet", strength: "4mg", dosePerKg: null, unit: "tab", maxDose: null },
  { name: "Ofloxacin", form: "Suspension", strength: "50mg/5ml", dosePerKg: 7.5, unit: "mg", maxDose: 200 },
  { name: "Vitamin D3", form: "Drops", strength: "400IU/drop", dosePerKg: null, unit: "drops", maxDose: null }
];

export interface ParsedStrength {
  mg: number;
  ml: number;
  mgPerMl: number;
  isLiquid: boolean;
}

/**
 * Parses liquid strength strings like "120mg/5ml", "1mg/ml" to compute mg/ml ratio.
 */
export function parseStrength(strength: string): ParsedStrength {
  const regex = /^([\d.]+)\s*mg\s*\/\s*([\d.]*)?\s*ml$/i;
  const match = strength.match(regex);
  if (match) {
    const mg = parseFloat(match[1]);
    const mlStr = match[2];
    const ml = mlStr && parseFloat(mlStr) ? parseFloat(mlStr) : 1;
    return {
      mg,
      ml,
      mgPerMl: mg / ml,
      isLiquid: true
    };
  }
  return {
    mg: 0,
    ml: 0,
    mgPerMl: 0,
    isLiquid: false
  };
}

/**
 * Rounds a number to a maximum of 2 decimal places.
 */
export function roundDose(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export interface CalculationResult {
  doseText: string;
  rawDose?: number;
  cappedDose?: number;
  volumeMl?: number;
  isLiquid: boolean;
}

/**
 * Calculates the dose based on weight, medicine rules, and override values.
 */
export function calculateDose(
  med: Medicine,
  weightKg: number | null,
  overrideDose: number | null
): CalculationResult {
  const parsed = parseStrength(med.strength);

  // If override dose is provided
  if (overrideDose !== null && !isNaN(overrideDose) && overrideDose > 0) {
    if (parsed.isLiquid) {
      const volume = overrideDose / parsed.mgPerMl;
      return {
        doseText: `${roundDose(overrideDose)}mg (${roundDose(volume)}ml)`,
        cappedDose: overrideDose,
        volumeMl: volume,
        isLiquid: true
      };
    } else {
      return {
        doseText: `${roundDose(overrideDose)} ${med.unit}`,
        cappedDose: overrideDose,
        isLiquid: false
      };
    }
  }

  // If dosePerKg is null, it's a fixed-dose medicine
  if (med.dosePerKg === null) {
    return {
      doseText: "As Directed",
      isLiquid: parsed.isLiquid
    };
  }

  // If weight is not entered
  if (weightKg === null || isNaN(weightKg) || weightKg <= 0) {
    return {
      doseText: "Enter Weight",
      isLiquid: parsed.isLiquid
    };
  }

  const rawDose = med.dosePerKg * weightKg;
  const cappedDose = med.maxDose !== null ? Math.min(rawDose, med.maxDose) : rawDose;

  if (parsed.isLiquid) {
    const volumeMl = cappedDose / parsed.mgPerMl;
    return {
      doseText: `${roundDose(cappedDose)}mg (${roundDose(volumeMl)}ml)`,
      rawDose,
      cappedDose,
      volumeMl,
      isLiquid: true
    };
  } else {
    return {
      doseText: `${roundDose(cappedDose)} ${med.unit}`,
      rawDose,
      cappedDose,
      isLiquid: false
    };
  }
}
