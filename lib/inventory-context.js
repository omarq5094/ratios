import { calculateInventory, LIFO_WARNING } from "./inventory-calculator.js";

export function buildInventoryContext(calculation) {
  const { ledger, remainingLayers, ...result } = calculation.selected;
  return { schemaVersion: 1, contextType: "inventory", currency: "SAR", status: calculation.status,
    method: calculation.method, operations: calculation.operations, result: calculation.status === "ready" ? result : null,
    comparison: calculation.status === "ready" ? calculation.comparison : [], lifoWarning: LIFO_WARNING,
    assumptions: ["جرد مستمر لمنتج واحد؛ الرصيد الابتدائي صفر، ويمكن إدخال المخزون الافتتاحي كأول شراء بتكلفته", "ترتيب زمني؛ وعند تساوي التاريخ يُعتمد ترتيب الإدخال", "المبالغ تكلفة وليست إيرادات أو أرباحًا؛ لا يُدخل سعر بيع", "لا يشمل التقييم بصافي القيمة القابلة للتحقق أو مصروفات لم تُدخل في تكلفة الوحدة"] };
}

export function normalizeInventoryContext(value) {
  if (value?.contextType !== "inventory") return null;
  try {
    // Ignore all client totals, text and instructions; reconstruct from operations.
    const context = buildInventoryContext(calculateInventory(value.operations, value.method));
    return JSON.stringify(context).length <= 24000 ? context : null;
  } catch { return null; }
}
