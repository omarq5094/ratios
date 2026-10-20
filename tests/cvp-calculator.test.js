import assert from "node:assert/strict";
import test from "node:test";
import { calculateCVP, CVPInputError } from "../lib/cvp-calculator.js";
const reference = { price: 70, variableCost: 42, fixedCosts: 84000, quantity: 2500, targetProfit: 14000 };
test("المثال الدراسي: المساهمة والنسبة والتعادل والخسارة والربح المستهدف", () => {
  const r = calculateCVP(reference);
  assert.equal(r.contribution, 28); assert.equal(r.contributionRatio, .4);
  assert.equal(r.breakEvenUnits, 3000); assert.equal(r.breakEvenSales, 210000);
  assert.equal(r.operatingProfit, -14000); assert.equal(r.targetUnits, 3500);
  assert.equal(r.revenue, 175000); assert.equal(r.totalCosts, 189000);
});
test("عند التعادل الربح صفر وفوقه ربح", () => {
  assert.equal(calculateCVP({ ...reference, quantity: 3000 }).operatingProfit, 0);
  assert.equal(calculateCVP({ ...reference, quantity: 3500 }).operatingProfit, 14000);
  assert.equal(calculateCVP({ ...reference, quantity: 0 }).operatingProfit, -84000);
});
test("تقريب الوحدات للأعلى مع بقاء قيمة التعادل النظرية", () => {
  const r = calculateCVP({ price: 10, variableCost: 7, fixedCosts: 10, quantity: 4, targetProfit: 1 });
  assert.equal(r.breakEvenUnits, 4); assert.equal(r.targetUnits, 4);
  assert.ok(Math.abs(r.breakEvenSales - 100/3) < 1e-12);
  assert.equal(r.operatingProfit, 2);
});
test("الكسور العشرية لا تضيف وحدة وهمية للتعادل أو الهدف", () => {
  const r = calculateCVP({ price: .3, variableCost: .2, fixedCosts: .3, quantity: 3, targetProfit: .1 });
  assert.equal(r.breakEvenUnits, 3); assert.equal(r.targetUnits, 4); assert.equal(r.operatingProfit, 0);
});
test("الصفر مسموح في المتغيرة والثابتة والكمية والهدف", () => {
  const r = calculateCVP({ price: 70, variableCost: 0, fixedCosts: 0, quantity: 0, targetProfit: 0 });
  assert.equal(r.contributionRatio, 1); assert.equal(r.breakEvenUnits, 0); assert.equal(r.targetUnits, 0); assert.equal(r.operatingProfit, 0);
});
test("الهدف الفارغ غير الهدف الصفري", () => {
  assert.equal(calculateCVP({ ...reference, targetProfit: "" }).targetUnits, null);
  assert.equal(calculateCVP({ ...reference, targetProfit: 0 }).targetUnits, 3000);
});
test("الأرقام العربية وفواصل الآلاف والفاصل العشري", () => {
  const r = calculateCVP({ price: "٧٠", variableCost: "۴۲", fixedCosts: "٨٤٬٠٠٠", quantity: "٢٬٥٠٠", targetProfit: "١٤٠٠٠٫٠٠" });
  assert.equal(r.breakEvenUnits, 3000); assert.equal(r.operatingProfit, -14000); assert.equal(r.targetUnits, 3500);
});
for (const [label, changes] of [
  ["سعر صفر", { price: 0 }], ["سعر سالب", { price: -1 }],
  ["متغيرة تساوي السعر", { variableCost: 70 }], ["متغيرة أكبر من السعر", { variableCost: 71 }],
  ["متغيرة سالبة", { variableCost: -1 }], ["ثابتة سالبة", { fixedCosts: -1 }],
  ["كمية سالبة", { quantity: -1 }], ["كمية كسرية", { quantity: 2.5 }],
  ["هدف سالب", { targetProfit: -1 }], ["مدخل فارغ", { fixedCosts: "" }],
  ["نص", { price: "abc" }], ["مالانهاية", { price: Infinity }], ["NaN", { quantity: NaN }],
  ["فواصل خاطئة", { fixedCosts: "84,00" }], ["دقة غير مدعومة", { price: "70.0000001" }],
  ["مدخل ضخم", { fixedCosts: "1000000000001" }],
  ["نتيجة غير آمنة", { price: "0.000002", variableCost: "0.000001", fixedCosts: "1000000000000" }],
]) test(`رفض ${label} برسالة وحقل محدد`, () => {
  assert.throws(() => calculateCVP({ ...reference, ...changes }), error => error instanceof CVPInputError && !!error.field && !!error.message);
});
