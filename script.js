const advancedRatioApi = window.AdvancedFinancialRatios;

const ratioMeta = {
  gross_margin: {
    label: "هامش مجمل الربح",
    type: "percent",
    description: "المتبقي من الإيرادات بعد تكلفة المبيعات.",
  },
  operating_margin: {
    label: "هامش التشغيل",
    type: "percent",
    description: "نتيجة النشاط التشغيلي مقارنة بالإيرادات.",
  },
  net_margin: {
    label: "هامش صافي الربح",
    type: "percent",
    description: "صافي الربح المتحقق من إجمالي الإيرادات.",
  },
  roe: {
    label: "العائد على حقوق الملكية",
    type: "percent",
    description: "كفاءة حقوق الملكية في توليد صافي الربح.",
  },
  debt_to_equity: {
    label: "الديون إلى حقوق الملكية",
    type: "multiple",
    description: "حجم الديون مقارنة بحقوق الملكية.",
  },
};

const FETCH_COOLDOWN_MS = 15_000;
const FETCH_COOLDOWN_KEY = "financialBenchmarkYahooNextFetchAt";

const form = document.querySelector("#financialForm");
const message = document.querySelector("#formMessage");
const resultsSection = document.querySelector("#results");
const ratioGrid = document.querySelector("#ratioGrid");
const tickerInput = document.querySelector("#tickerInput");
const fetchCompanyButton = document.querySelector("#fetchCompanyButton");
const dataFetchStatus = document.querySelector("#dataFetchStatus");
const importSummary = document.querySelector("#importSummary");
const valuationRatioGrid = document.querySelector("#valuationRatioGrid");
const operationsRatioGrid = document.querySelector("#operationsRatioGrid");
const missingDataPanel = document.querySelector("#missingDataPanel");
const missingFieldsGrid = document.querySelector("#missingFieldsGrid");
const applyMissingFieldsButton = document.querySelector("#applyMissingFieldsButton");

const importedFieldLabels = {
  revenue: "الإيرادات",
  costOfSales: "تكلفة المبيعات",
  operatingProfit: "الربح التشغيلي",
  netProfit: "صافي الربح",
  currentAssets: "الأصول المتداولة",
  inventory: "المخزون",
  currentLiabilities: "الالتزامات المتداولة",
  totalAssets: "إجمالي الأصول",
  totalDebt: "إجمالي الديون",
  equity: "حقوق الملكية",
  previousAssets: "أصول السنة السابقة",
  previousEquity: "حقوق السنة السابقة",
  operatingCashFlow: "التدفق النقدي التشغيلي",
  interestExpense: "مصروف التمويل",
  marketCap: "القيمة السوقية",
  freeCashFlow: "التدفق النقدي الحر",
  enterpriseValue: "قيمة المنشأة",
  ebitda: "الأرباح قبل الفوائد والضرائب والاستهلاك والإطفاء",
  cashAndEquivalents: "النقد وما في حكمه",
  previousInventory: "مخزون السنة السابقة",
  annualDividendPerShare: "التوزيعات السنوية للسهم",
  sharePrice: "سعر السهم",
  totalDividends: "إجمالي توزيعات الأرباح",
  earningsGrowthPercent: "معدل نمو الأرباح",
};

const numberFormatter = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });
const compactNumberFormatter = new Intl.NumberFormat("ar-SA", {
  maximumFractionDigits: 2,
  notation: "compact",
});
let fetchInProgress = false;
let cooldownTimer = 0;
let nextFetchAt = readCooldownDeadline();
let currencyUnit = "ر.س";

function valueOf(id) {
  const value = Number(document.querySelector(`#${id}`).value);
  return Number.isFinite(value) ? value : 0;
}

function nullableValueOf(id) {
  const rawValue = document.querySelector(`#${id}`).value.trim();
  if (rawValue === "") return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function textOf(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function formatRatio(value, type) {
  if (value === null || !Number.isFinite(value)) return "غير متاح";
  if (type === "percent") return `${numberFormatter.format(value * 100)}٪`;
  return `${numberFormatter.format(value)} مرة`;
}

function formatAdvancedValue(value, type) {
  if (value === null || !Number.isFinite(value)) return "غير متاح";
  if (type === "currency") return `${compactNumberFormatter.format(value)} ${currencyUnit}`;
  return formatRatio(value, type);
}

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `form-message ${type}`;
}

function showFetchStatus(text, type = "loading") {
  dataFetchStatus.textContent = text;
  dataFetchStatus.className = `fetch-status ${type}`;
  dataFetchStatus.hidden = !text;
}

function readCooldownDeadline() {
  try {
    const storedValue = Number(window.localStorage.getItem(FETCH_COOLDOWN_KEY));
    return Number.isFinite(storedValue) && storedValue > Date.now() ? storedValue : 0;
  } catch {
    return 0;
  }
}

function saveCooldownDeadline(value) {
  try {
    if (value > Date.now()) {
      window.localStorage.setItem(FETCH_COOLDOWN_KEY, String(value));
    } else {
      window.localStorage.removeItem(FETCH_COOLDOWN_KEY);
    }
  } catch {
    // يبقى المؤقت فعالًا في الذاكرة إذا منع المتصفح التخزين المحلي.
  }
}

function cooldownSecondsLeft() {
  return Math.max(0, Math.ceil((nextFetchAt - Date.now()) / 1000));
}

function updateFetchButton() {
  window.clearTimeout(cooldownTimer);

  if (fetchInProgress) {
    fetchCompanyButton.disabled = true;
    fetchCompanyButton.dataset.state = "loading";
    fetchCompanyButton.textContent = "جارٍ الجلب...";
    tickerInput.setAttribute("aria-busy", "true");
    return;
  }

  tickerInput.setAttribute("aria-busy", "false");
  const secondsLeft = cooldownSecondsLeft();
  if (secondsLeft > 0) {
    fetchCompanyButton.disabled = true;
    fetchCompanyButton.dataset.state = "cooldown";
    fetchCompanyButton.textContent = `طلب جديد بعد ${secondsLeft} ث`;
    cooldownTimer = window.setTimeout(updateFetchButton, 250);
    return;
  }

  nextFetchAt = 0;
  saveCooldownDeadline(0);
  fetchCompanyButton.disabled = false;
  fetchCompanyButton.dataset.state = "ready";
  fetchCompanyButton.textContent = "جلب البيانات";
}

function setFetchLoading(isLoading) {
  fetchInProgress = isLoading;
  updateFetchButton();
}

function startFetchCooldown() {
  nextFetchAt = Date.now() + FETCH_COOLDOWN_MS;
  saveCooldownDeadline(nextFetchAt);
  updateFetchButton();
}

function resetImportPresentation() {
  importSummary.hidden = true;
  showFetchStatus("");
  Object.keys(importedFieldLabels).forEach((id) => {
    document.querySelector(`#${id}`).closest(".field")?.classList.remove("auto-filled", "missing-field");
  });
}

function clearFinancialFields() {
  Object.keys(importedFieldLabels).forEach((id) => {
    document.querySelector(`#${id}`).value = "";
  });
}

function updateCurrencyUnits(currency) {
  const unit = currency === "SAR" ? "ر.س" : currency || "عملة التقرير";
  currencyUnit = unit;
  document.querySelectorAll(".number-field small").forEach((element) => {
    element.textContent = unit;
  });
}

function applyImportedData(data) {
  resetImportPresentation();
  clearFinancialFields();

  document.querySelector("#projectName").value = data.companyName || data.symbol;
  updateCurrencyUnits(data.currency);

  Object.entries(importedFieldLabels).forEach(([id]) => {
    const input = document.querySelector(`#${id}`);
    const value = data.fields?.[id];
    const field = input.closest(".field");
    if (typeof value === "number" && Number.isFinite(value)) {
      input.value = String(value);
      field?.classList.add("auto-filled");
    } else {
      input.value = "";
      field?.classList.add("missing-field");
    }
  });

  const missingLabels = (data.missingFields || []).map((key) => importedFieldLabels[key]).filter(Boolean);
  const metaParts = [data.symbol, data.source?.provider].filter(Boolean);
  document.querySelector("#importCompanyName").textContent = data.companyName || data.symbol;
  document.querySelector("#importCompanyMeta").textContent = metaParts.join(" · ");
  document.querySelector("#importCurrencyBadge").textContent = `العملة: ${data.currency || "غير محددة"}`;
  document.querySelector("#importCoverageBadge").textContent = `تم جلب ${data.availableFieldCount} من ${data.totalFieldCount} حقلًا`;
  document.querySelector("#importSourceLink").href = data.source?.url || "#";

  const notes = [];
  if (missingLabels.length) notes.push(`راجع الحقول الناقصة يدويًا: ${missingLabels.join("، ")}.`);
  notes.push("راجع الأرقام مع القوائم المنشورة قبل اعتماد النتيجة.");
  document.querySelector("#importMissingNote").textContent = notes.join(" ");
  importSummary.hidden = false;

  const requiredMissing = [
    "revenue",
    "costOfSales",
    "operatingProfit",
    "netProfit",
    "currentAssets",
    "inventory",
    "currentLiabilities",
    "totalAssets",
    "totalDebt",
    "equity",
  ].filter((key) => data.missingFields?.includes(key));

  if (requiredMissing.length) {
    showFetchStatus("تم جلب البيانات المتاحة. أكمل المراجعة والحقول المعلّمة قبل الحساب.", "warning");
  } else {
    showFetchStatus("تمت تعبئة أحدث القوائم المالية المتاحة. راجع الأرقام قبل الحساب.", "success");
  }
}

async function fetchCompanyData() {
  const rawSymbol = tickerInput.value.trim();
  if (!/^[0-9٠-٩۰-۹]{4}(?:\.sr)?$/i.test(rawSymbol)) {
    showFetchStatus("أدخل رمز تداول مكوّنًا من أربعة أرقام، مثل 2222.", "error");
    tickerInput.focus();
    return;
  }

  if (fetchInProgress) return;

  const secondsLeft = cooldownSecondsLeft();
  if (secondsLeft > 0) {
    showFetchStatus(`يمكنك إجراء طلب جديد بعد ${secondsLeft} ثانية.`, "warning");
    updateFetchButton();
    return;
  }

  startFetchCooldown();
  setFetchLoading(true);
  importSummary.hidden = true;
  showFetchStatus("يجري الآن جلب أحدث قائمة مالية سنوية مكتملة...", "loading");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 50_000);

  try {
    const response = await fetch(`/api/company-data?symbol=${encodeURIComponent(rawSymbol)}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      throw new Error(payload?.message || "تعذر الوصول إلى خدمة جلب البيانات.");
    }

    applyImportedData(payload);
  } catch (error) {
    const isTimeout = error?.name === "AbortError";
    const localHint = window.location.protocol === "file:" ? " تعمل الميزة بعد النشر على Vercel أو التشغيل عبر vercel dev." : "";
    showFetchStatus(
      isTimeout ? "استغرق Yahoo وقتًا أطول من المتوقع. حاول مرة أخرى بعد قليل." : `${error.message || "تعذر جلب البيانات."}${localHint}`,
      "error",
    );
  } finally {
    window.clearTimeout(timeout);
    setFetchLoading(false);
  }
}

function calculate(values) {
  const averageAssets = values.previousAssets > 0 ? (values.totalAssets + values.previousAssets) / 2 : values.totalAssets;
  const averageEquity = values.previousEquity > 0 ? (values.equity + values.previousEquity) / 2 : values.equity;

  return {
    gross_margin: (values.revenue - values.costOfSales) / values.revenue,
    operating_margin: values.operatingProfit / values.revenue,
    net_margin: values.netProfit / values.revenue,
    current_ratio: values.currentAssets / values.currentLiabilities,
    quick_ratio: (values.currentAssets - values.inventory) / values.currentLiabilities,
    debt_to_equity: values.totalDebt / values.equity,
    roa: values.netProfit / averageAssets,
    roe: values.netProfit / averageEquity,
    interest_coverage: values.interestExpense > 0 ? values.operatingProfit / values.interestExpense : null,
    cash_quality:
      values.operatingCashFlow !== null && values.netProfit !== 0
        ? values.operatingCashFlow / values.netProfit
        : null,
  };
}

function renderPrimaryRatios(ratios) {
  ratioGrid.replaceChildren();

  Object.entries(ratioMeta).forEach(([code, meta]) => {
    const card = document.createElement("article");
    card.className = "ratio-result-card";

    const title = document.createElement("span");
    title.textContent = meta.label;
    const value = document.createElement("strong");
    value.textContent = formatRatio(ratios[code], meta.type);
    const note = document.createElement("p");
    note.className = "ratio-result-note";
    note.textContent = meta.description;

    card.append(title, value, note);
    ratioGrid.append(card);
  });
}

function renderAdvancedCard(item) {
  const card = document.createElement("article");
  card.className = `expanded-ratio-card ${item.status === "available" ? "" : item.status}`.trim();

  const title = document.createElement("span");
  title.textContent = item.label;
  const english = document.createElement("small");
  english.textContent = item.english;
  const value = document.createElement("strong");
  const description = document.createElement("p");
  description.textContent = item.description;
  card.append(title, english, value, description);

  if (item.status === "available") {
    value.textContent = formatAdvancedValue(item.value, item.type);
    return card;
  }

  const status = document.createElement("p");
  status.className = "ratio-data-status";
  if (item.status === "missing") {
    value.textContent = "بيانات ناقصة";
    const labels = item.missingFields.map((key) => advancedRatioApi.fieldLabels[key] || key);
    status.textContent = `ينقص: ${labels.join("، ")}.`;
  } else {
    value.textContent = "غير قابل للتفسير";
    status.textContent = item.invalidReason;
  }
  card.append(status);
  return card;
}

function renderAdvancedRatios(values, ratios) {
  const results = advancedRatioApi.calculate(values);
  valuationRatioGrid.replaceChildren();
  operationsRatioGrid.replaceChildren();

  results.forEach((item) => {
    const target = item.group === "valuation" ? valuationRatioGrid : operationsRatioGrid;
    target.append(renderAdvancedCard(item));
  });

  const missingResults = [...results];
  if (ratios.interest_coverage === null && values.interestExpense === null) {
    missingResults.push({ status: "missing", missingFields: ["interestExpense"] });
  }
  renderMissingFields(missingResults);
}

function unitLabelFor(fieldName) {
  const unit = advancedRatioApi.inputMeta[fieldName]?.unit;
  if (unit === "percent") return "٪";
  if (unit === "currency_per_share") return `${currencyUnit} للسهم`;
  return currencyUnit;
}

function renderMissingFields(results) {
  const missingFields = [
    ...new Set(
      results
        .filter((item) => item.status === "missing")
        .flatMap((item) => item.missingFields)
        .filter((fieldName) => advancedRatioApi.fieldLabels[fieldName]),
    ),
  ];

  missingFieldsGrid.replaceChildren();
  missingDataPanel.hidden = missingFields.length === 0;
  if (!missingFields.length) return;

  missingFields.forEach((fieldName) => {
    const meta = advancedRatioApi.inputMeta[fieldName] || {};
    const label = document.createElement("label");
    label.className = "missing-input-card";
    const title = document.createElement("span");
    title.textContent = advancedRatioApi.fieldLabels[fieldName];
    const helper = document.createElement("small");
    helper.textContent = "أدخل القيمة من القوائم أو المصدر الرسمي.";
    const wrap = document.createElement("div");
    wrap.className = "missing-input-wrap";
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.dataset.field = fieldName;
    input.setAttribute("aria-label", advancedRatioApi.fieldLabels[fieldName]);
    if (typeof meta.min === "number") input.min = String(meta.min);
    const savedValue = document.querySelector(`#${fieldName}`)?.value;
    if (savedValue) input.value = savedValue;
    const unit = document.createElement("b");
    unit.textContent = unitLabelFor(fieldName);
    wrap.append(input, unit);
    label.append(title, helper, wrap);
    missingFieldsGrid.append(label);
  });
}

function renderResults(values, ratios, shouldScroll = true) {
  setText("resultTitle", values.projectName || "مشروعك");
  setText("currentRatioValue", formatRatio(ratios.current_ratio, "multiple"));
  setText("quickRatioValue", formatRatio(ratios.quick_ratio, "multiple"));
  setText("roaValue", formatRatio(ratios.roa, "percent"));
  setText("coverageValue", formatRatio(ratios.interest_coverage, "multiple"));
  setText(
    "resultSummary",
    "تم حساب المؤشرات من البيانات المتاحة والمدخلة. تعتمد مؤشرات التقييم السوقي على أحدث قيمة سوقية متاحة مع أحدث بيانات سنوية مكتملة؛ لذلك يجب مراجعة المصدر والقوائم الرسمية قبل تفسير النتائج.",
  );
  renderPrimaryRatios(ratios);
  renderAdvancedRatios(values, ratios);

  resultsSection.hidden = false;
  if (shouldScroll) resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectValues() {
  return {
    projectName: textOf("projectName"),
    revenue: valueOf("revenue"),
    costOfSales: valueOf("costOfSales"),
    operatingProfit: valueOf("operatingProfit"),
    netProfit: valueOf("netProfit"),
    currentAssets: valueOf("currentAssets"),
    inventory: valueOf("inventory"),
    currentLiabilities: valueOf("currentLiabilities"),
    totalAssets: valueOf("totalAssets"),
    totalDebt: valueOf("totalDebt"),
    equity: valueOf("equity"),
    previousAssets: nullableValueOf("previousAssets"),
    previousEquity: nullableValueOf("previousEquity"),
    operatingCashFlow: nullableValueOf("operatingCashFlow"),
    interestExpense: nullableValueOf("interestExpense"),
    marketCap: nullableValueOf("marketCap"),
    freeCashFlow: nullableValueOf("freeCashFlow"),
    enterpriseValue: nullableValueOf("enterpriseValue"),
    ebitda: nullableValueOf("ebitda"),
    cashAndEquivalents: nullableValueOf("cashAndEquivalents"),
    previousInventory: nullableValueOf("previousInventory"),
    annualDividendPerShare: nullableValueOf("annualDividendPerShare"),
    sharePrice: nullableValueOf("sharePrice"),
    totalDividends: nullableValueOf("totalDividends"),
    earningsGrowthPercent: nullableValueOf("earningsGrowthPercent"),
  };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showMessage("");
  if (!form.reportValidity()) return;

  const values = collectValues();
  if (values.inventory > values.currentAssets) {
    showMessage("المخزون لا يمكن أن يكون أكبر من إجمالي الأصول المتداولة.", "error");
    return;
  }
  if (values.totalDebt > values.totalAssets * 5) {
    showMessage("راجع إجمالي الديون؛ القيمة تبدو مرتفعة جدًا مقارنةً بالأصول.", "warning");
  }

  const ratios = calculate(values);
  renderResults(values, ratios);
  showMessage("تم الحساب محليًا داخل جهازك، ولم تُحفظ بياناتك المالية.", "success");
});

applyMissingFieldsButton.addEventListener("click", () => {
  const inputs = [...missingFieldsGrid.querySelectorAll("input[data-field]")];
  let updatedCount = 0;

  for (const input of inputs) {
    const rawValue = input.value.trim();
    if (rawValue === "") continue;
    const value = Number(rawValue);
    const minimum = input.min === "" ? null : Number(input.min);
    if (!Number.isFinite(value) || (minimum !== null && value < minimum)) {
      input.focus();
      showMessage(`راجع قيمة ${advancedRatioApi.fieldLabels[input.dataset.field]}.`, "error");
      return;
    }

    const target = document.querySelector(`#${input.dataset.field}`);
    if (target) {
      target.value = String(value);
      updatedCount += 1;
    }
  }

  if (!updatedCount) {
    showMessage("أدخل قيمة واحدة على الأقل من البيانات الناقصة.", "warning");
    return;
  }

  const values = collectValues();
  const ratios = calculate(values);
  renderResults(values, ratios, false);
  showMessage("تم تحديث النسب باستخدام البيانات التي أدخلتها.", "success");
});

document.querySelector("#resetButton").addEventListener("click", () => {
  form.reset();
  resultsSection.hidden = true;
  showMessage("");
  resetImportPresentation();
  missingDataPanel.hidden = true;
  missingFieldsGrid.replaceChildren();
  updateCurrencyUnits("SAR");
  updateFetchButton();
  document.querySelector("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
});

fetchCompanyButton.addEventListener("click", fetchCompanyData);
tickerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    fetchCompanyData();
  }
});

updateFetchButton();
