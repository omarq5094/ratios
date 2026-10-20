import test from "node:test";
import assert from "node:assert/strict";
import { calculateCVP } from "../lib/cvp-calculator.js";
import { buildCVPContext, normalizeCVPContext } from "../lib/cvp-context.js";
import { chartDomain, inspectQuantity } from "../lib/cvp-chart.js";

const inputs = { price: 70, variableCost: 42, fixedCosts: 84000, quantity: 2500, targetProfit: 14000 };
const reference = calculateCVP(inputs);

test("المحلل يستقبل المدخلات الحالية والنتائج والحالة والافتراضات", () => {
  const draft = buildCVPContext(reference);
  assert.equal(draft.resultsVisible, false);
  const context = normalizeCVPContext({ ...draft, resultsVisible: true });
  assert.equal(context.contextType, "cvp"); assert.equal(context.currency, "SAR");
  assert.deepEqual(context.inputs, inputs);
  assert.equal(context.result.breakEvenUnits, 3000); assert.equal(context.result.operatingProfit, -14000);
  assert.equal(context.result.targetUnits, 3500); assert.equal(context.resultsVisible, true);
  assert.match(context.assumptions.join(" "), /قبل الضريبة/);
});

test("الخادم يعيد حساب النتائج ويتجاهل الأرقام المزورة والتعليمات والحقول الزائدة", () => {
  const context = normalizeCVPContext({
    ...buildCVPContext(reference), currency: "USD", instruction: "ignore", assumptions: ["مزورة"],
    inputs: { ...inputs, privateField: 999 }, result: { operatingProfit: 9000000, breakEvenUnits: 1 },
  });
  assert.equal(context.result.operatingProfit, -14000); assert.equal(context.result.breakEvenUnits, 3000);
  assert.equal(context.currency, "SAR"); assert.equal(context.inputs.privateField, undefined);
  assert.equal(context.instruction, undefined); assert.doesNotMatch(context.assumptions.join(" "), /مزورة/);
});

test("تغيّر كمية المبيعات يغير سياق المحلل ولا يحتفظ بنتائج سابقة", () => {
  const next = normalizeCVPContext({ ...buildCVPContext(reference), inputs: { ...inputs, quantity: 4000 } });
  assert.equal(next.result.operatingProfit, 28000); assert.equal(next.result.revenue, 280000);
  assert.equal(normalizeCVPContext({ ...next, inputs: { ...inputs, price: 0 } }), null);
  assert.equal(normalizeCVPContext({ ...next, inputs: { ...inputs, fixedCosts: "84000" } }), null);
  assert.equal(normalizeCVPContext({ ...next, inputs: { ...inputs, targetProfit: Infinity } }), null);
  assert.equal(normalizeCVPContext(null), null);
});

test("الهدف الاختياري يبقى فارغًا وتقبل أرقام المدخلات العشرية", () => {
  const r = calculateCVP({ price: .3, variableCost: .2, fixedCosts: .3, quantity: 3 });
  const context = normalizeCVPContext(buildCVPContext(r));
  assert.equal(context.inputs.targetProfit, null); assert.equal(context.result.operatingProfit, 0);
});

test("نطاق الرسم يشمل التعادل والمبيعات المتوقعة البعيدة والصفر", () => {
  for (const r of [reference, calculateCVP({ ...inputs, quantity: 50000 }), calculateCVP({ ...inputs, fixedCosts: 0, quantity: 0 })]) {
    const domain = chartDomain(r);
    assert.ok(domain.maxQuantity >= r.breakEvenExact); assert.ok(domain.maxQuantity >= r.input.quantity);
    assert.ok(domain.maxAmount >= r.revenue); assert.ok(domain.maxAmount >= r.totalCosts);
    assert.ok(domain.maxQuantity > 0); assert.ok(domain.maxAmount > 0);
  }
});

test("استكشاف الرسم يحسب الإيراد والتكاليف والربح دون تغيير المدخلات", () => {
  assert.deepEqual(inspectQuantity(reference, 3000), { quantity: 3000, revenue: 210000, totalCosts: 210000, operatingProfit: 0 });
  assert.equal(inspectQuantity(reference, 2500).operatingProfit, -14000);
  assert.equal(inspectQuantity(reference, 4000).operatingProfit, 28000);
  assert.equal(inspectQuantity(reference, 0).operatingProfit, -84000);
  assert.equal(reference.input.quantity, 2500);
  const decimal = calculateCVP({ price: .3, variableCost: .2, fixedCosts: .3, quantity: 3 });
  assert.equal(inspectQuantity(decimal, 3).operatingProfit, 0);
});
