import { calculateInventory, LIFO_WARNING } from "./inventory-calculator.js";
import { INVENTORY_EXAMPLES } from "./inventory-examples.js";

export function buildInventoryContext(calculation, exampleId = null) {
  const { ledger, remainingLayers, ...result } = calculation.selected;
  const teaching = Object.hasOwn(INVENTORY_EXAMPLES, exampleId) ? INVENTORY_EXAMPLES[exampleId] : null;
  const matchesExample = teaching && teaching.operations.length === calculation.operations.length && teaching.operations.every((op, index) => {
    const actual = calculation.operations[index];
    return actual.type === op.type && actual.date === op.date && Number(actual.quantity) === Number(op.quantity) && Number(actual.unitCost) === Number(op.unitCost);
  });
  return { schemaVersion: 1, contextType: "inventory", currency: "SAR", status: calculation.status,
    teachingExample: matchesExample ? { id: exampleId, title: teaching.title, lesson: teaching.lesson } : null,
    method: calculation.method, operations: calculation.operations, result: calculation.status === "ready" ? result : null,
    comparison: calculation.status === "ready" ? calculation.comparison : [], lifoWarning: LIFO_WARNING,
    assumptions: ["جرد مستمر لمنتج واحد؛ الرصيد الابتدائي صفر، ويمكن إدخال المخزون الافتتاحي كأول شراء بتكلفته", "ترتيب زمني؛ وعند تساوي التاريخ يُعتمد ترتيب الإدخال", "المبالغ تكلفة وليست إيرادات أو أرباحًا؛ لا يُدخل سعر بيع", "لا يشمل التقييم بصافي القيمة القابلة للتحقق أو مصروفات لم تُدخل في تكلفة الوحدة"] };
}

export function normalizeInventoryContext(value) {
  if (value?.contextType !== "inventory") return null;
  try {
    // Ignore all client totals, text and instructions; reconstruct from operations.
    const context = buildInventoryContext(calculateInventory(value.operations, value.method), value.teachingExample?.id);
    return JSON.stringify(context).length <= 24000 ? context : null;
  } catch { return null; }
}
