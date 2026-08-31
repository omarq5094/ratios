import assert from "node:assert/strict";
import test from "node:test";
import { calculateDepreciation, validateDepreciationInput } from "../lib/depreciation-calculator.js";

test("يحسب القسط الثابت ويصل إلى القيمة المتبقية", () => {
  const result = calculateDepreciation({
    method: "straight_line",
    cost: 100000,
    residualValue: 10000,
    usefulLife: 5,
  });

  assert.equal(result.depreciableAmount, 90000);
  assert.equal(result.annualDepreciation, 18000);
  assert.equal(result.monthlyDepreciation, 1500);
  assert.deepEqual(result.schedule.map((row) => row.depreciation), [18000, 18000, 18000, 18000, 18000]);
  assert.equal(result.schedule.at(-1).closingBookValue, 10000);
});

test("يحسب الرصيد المتناقص ويسوي السنة الأخيرة", () => {
  const result = calculateDepreciation({
    method: "double_declining",
    cost: 100000,
    residualValue: 10000,
    usefulLife: 5,
  });

  assert.equal(result.decliningRate, 0.4);
  assert.deepEqual(result.schedule.map((row) => row.depreciation), [40000, 24000, 14400, 8640, 2960]);
  assert.equal(result.schedule.at(-1).accumulatedDepreciation, 90000);
  assert.equal(result.schedule.at(-1).closingBookValue, 10000);
});

test("يحسب وحدات الإنتاج حسب الاستخدام الفعلي", () => {
  const result = calculateDepreciation({
    method: "units_of_production",
    cost: 100000,
    residualValue: 10000,
    usefulLife: 5,
    totalUnits: 90000,
    producedUnits: 20000,
  });

  assert.equal(result.depreciationPerUnit, 1);
  assert.equal(result.currentPeriodDepreciation, 20000);
  assert.equal(result.schedule[0].closingBookValue, 80000);
});

test("يمنع القيمة المتبقية الأعلى من التكلفة", () => {
  assert.throws(
    () => validateDepreciationInput({ method: "straight_line", cost: 10000, residualValue: 12000, usefulLife: 5 }),
    /القيمة المتبقية/,
  );
});

test("يمنع إنتاج فترة يتجاوز الإنتاج المتوقع", () => {
  assert.throws(
    () => calculateDepreciation({ method: "units_of_production", cost: 10000, residualValue: 0, usefulLife: 5, totalUnits: 100, producedUnits: 101 }),
    /وحدات الفترة الحالية/,
  );
});

