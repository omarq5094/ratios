import { calculateCVP } from "./cvp-calculator.js";

export function buildCVPContext(calculation, resultsVisible = false) {
  const { input, ...result } = calculation;
  return {
    schemaVersion: 1, contextType: "cvp", currency: "SAR", resultsVisible,
    inputs: { ...input }, result,
    assumptions: ["منتج واحد والفترة نفسها", "ثبات سعر الوحدة والتكلفة المتغيرة والثابتة ضمن نطاق التحليل", "الربح التشغيلي قبل الضريبة"],
  };
}

// Only accept numeric inputs. Recalculate results instead of trusting client totals.
export function normalizeCVPContext(value) {
  if (value?.contextType !== "cvp" || !value.inputs || Array.isArray(value.inputs)) return null;
  const inputs = {};
  for (const key of ["price", "variableCost", "fixedCosts", "quantity", "targetProfit"]) {
    const number = value.inputs[key];
    if (key === "targetProfit" && (number === null || number === undefined)) { inputs[key] = ""; continue; }
    if (typeof number !== "number" || !Number.isFinite(number)) return null;
    inputs[key] = number;
  }
  try { return buildCVPContext(calculateCVP(inputs), value.resultsVisible === true); }
  catch { return null; }
}
