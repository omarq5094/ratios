const METHODS = new Set(["straight_line", "double_declining", "units_of_production"]);

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function finiteNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${label} يجب أن يكون رقمًا صالحًا.`);
  return number;
}

export function validateDepreciationInput(rawInput = {}) {
  const method = String(rawInput.method || "");
  if (!METHODS.has(method)) throw new RangeError("اختر طريقة إهلاك صالحة.");

  const cost = finiteNumber(rawInput.cost, "تكلفة الأصل");
  const residualValue = finiteNumber(rawInput.residualValue, "القيمة المتبقية");
  const usefulLife = finiteNumber(rawInput.usefulLife, "العمر الإنتاجي");

  if (cost <= 0) throw new RangeError("تكلفة الأصل يجب أن تكون أكبر من صفر.");
  if (residualValue < 0 || residualValue > cost) {
    throw new RangeError("القيمة المتبقية يجب أن تكون بين صفر وتكلفة الأصل.");
  }
  if (!Number.isInteger(usefulLife) || usefulLife < 1 || usefulLife > 100) {
    throw new RangeError("العمر الإنتاجي يجب أن يكون عددًا صحيحًا بين سنة و100 سنة.");
  }

  const normalized = { method, cost: money(cost), residualValue: money(residualValue), usefulLife };
  if (method !== "units_of_production") return normalized;

  const totalUnits = finiteNumber(rawInput.totalUnits, "إجمالي الوحدات المتوقعة");
  const producedUnits = finiteNumber(rawInput.producedUnits, "وحدات الفترة الحالية");
  if (totalUnits <= 0) throw new RangeError("إجمالي الوحدات المتوقعة يجب أن يكون أكبر من صفر.");
  if (producedUnits < 0 || producedUnits > totalUnits) {
    throw new RangeError("وحدات الفترة الحالية يجب ألا تتجاوز إجمالي الوحدات المتوقعة.");
  }

  return { ...normalized, totalUnits, producedUnits };
}

function straightLine(input, depreciableAmount) {
  const standardAnnual = money(depreciableAmount / input.usefulLife);
  let accumulated = 0;
  const schedule = [];

  for (let year = 1; year <= input.usefulLife; year += 1) {
    const openingBookValue = money(input.cost - accumulated);
    const remaining = money(depreciableAmount - accumulated);
    const depreciation = year === input.usefulLife ? remaining : Math.min(standardAnnual, remaining);
    accumulated = money(accumulated + depreciation);
    schedule.push({
      period: year,
      label: `السنة ${year}`,
      openingBookValue,
      depreciation: money(depreciation),
      accumulatedDepreciation: accumulated,
      closingBookValue: money(input.cost - accumulated),
    });
  }

  return {
    schedule,
    annualDepreciation: standardAnnual,
    monthlyDepreciation: money(standardAnnual / 12),
    formula: "(تكلفة الأصل − القيمة المتبقية) ÷ العمر الإنتاجي",
    summary: "يوزّع المبلغ القابل للإهلاك بالتساوي على سنوات العمر الإنتاجي.",
  };
}

function doubleDeclining(input, depreciableAmount) {
  const rate = 2 / input.usefulLife;
  let accumulated = 0;
  const schedule = [];

  for (let year = 1; year <= input.usefulLife; year += 1) {
    const openingBookValue = money(input.cost - accumulated);
    const remaining = money(depreciableAmount - accumulated);
    const calculated = money(openingBookValue * rate);
    const depreciation = year === input.usefulLife ? remaining : Math.min(calculated, remaining);
    accumulated = money(accumulated + depreciation);
    schedule.push({
      period: year,
      label: `السنة ${year}`,
      openingBookValue,
      depreciation: money(depreciation),
      accumulatedDepreciation: accumulated,
      closingBookValue: money(input.cost - accumulated),
    });
  }

  return {
    schedule,
    decliningRate: rate,
    firstYearDepreciation: schedule[0]?.depreciation || 0,
    formula: `القيمة الدفترية أول السنة × ${(rate * 100).toFixed(2).replace(/\.00$/, "")}%`,
    summary: "يسجّل مصروفًا أكبر في السنوات الأولى، مع تسوية السنة الأخيرة عند القيمة المتبقية.",
  };
}

function unitsOfProduction(input, depreciableAmount) {
  const depreciationPerUnit = depreciableAmount / input.totalUnits;
  const currentDepreciation = money(depreciationPerUnit * input.producedUnits);
  return {
    schedule: [{
      period: 1,
      label: "الفترة الحالية",
      openingBookValue: input.cost,
      depreciation: currentDepreciation,
      accumulatedDepreciation: currentDepreciation,
      closingBookValue: money(input.cost - currentDepreciation),
      producedUnits: input.producedUnits,
    }],
    depreciationPerUnit: money(depreciationPerUnit),
    currentPeriodDepreciation: currentDepreciation,
    formula: "الإنتاج الفعلي × ((التكلفة − القيمة المتبقية) ÷ إجمالي الإنتاج المتوقع)",
    summary: "يربط الإهلاك بالاستخدام الفعلي للأصل بدل مرور الزمن.",
  };
}

export function calculateDepreciation(rawInput) {
  const input = validateDepreciationInput(rawInput);
  const depreciableAmount = money(input.cost - input.residualValue);
  const calculated = input.method === "straight_line"
    ? straightLine(input, depreciableAmount)
    : input.method === "double_declining"
      ? doubleDeclining(input, depreciableAmount)
      : unitsOfProduction(input, depreciableAmount);

  return { input, depreciableAmount, ...calculated };
}

