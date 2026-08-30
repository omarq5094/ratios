const advancedRatioApi = window.AdvancedFinancialRatios;
const bankRatioApi = window.BankFinancialRatios;

const ratioMeta = {
  gross_margin: {
    label: "هامش مجمل الربح",
    type: "percent",
    formula: "(الإيرادات − تكلفة المبيعات) ÷ الإيرادات",
    description: "المتبقي من الإيرادات بعد تكلفة المبيعات.",
    negativeDescription: "النتيجة سالبة لأن تكلفة المبيعات تجاوزت الإيرادات.",
  },
  operating_margin: {
    label: "هامش التشغيل",
    type: "percent",
    formula: "الربح التشغيلي ÷ الإيرادات",
    description: "نتيجة النشاط التشغيلي مقارنة بالإيرادات.",
    negativeDescription: "النتيجة سالبة لأن النشاط سجل خسارة تشغيلية.",
  },
  net_margin: {
    label: "هامش صافي الربح",
    type: "percent",
    formula: "صافي الربح ÷ الإيرادات",
    description: "صافي الربح المتحقق من إجمالي الإيرادات.",
    negativeDescription: "النتيجة سالبة لأن الشركة سجلت صافي خسارة.",
  },
  roe: {
    label: "العائد على حقوق الملكية",
    type: "percent",
    formula: "صافي الربح ÷ متوسط حقوق الملكية",
    description: "كفاءة حقوق الملكية في توليد صافي الربح.",
    negativeDescription: "النتيجة سالبة بسبب وجود قيمة سالبة في صافي الربح أو حقوق الملكية المستخدمة.",
  },
  debt_to_equity: {
    label: "الديون إلى حقوق الملكية",
    type: "multiple",
    formula: "إجمالي الديون ÷ حقوق الملكية",
    description: "حجم الديون مقارنة بحقوق الملكية.",
    negativeDescription: "النتيجة سالبة لأن حقوق الملكية المستخدمة في الحساب سالبة.",
  },
};

const commonRatioMeta = {
  roe: {
    label: "العائد على حقوق الملكية",
    type: "percent",
    formula: "صافي الربح ÷ متوسط حقوق الملكية",
    description: "كفاءة حقوق الملكية في توليد صافي الربح.",
    negativeDescription: "النتيجة سالبة بسبب وجود قيمة سالبة في صافي الربح أو حقوق الملكية المستخدمة.",
  },
  roa: {
    label: "العائد على الأصول",
    type: "percent",
    formula: "صافي الربح ÷ متوسط إجمالي الأصول",
    description: "كفاءة الأصول في توليد صافي الربح.",
    negativeDescription: "النتيجة سالبة لأن المنشأة سجلت صافي خسارة.",
  },
};

const summaryRatioMeta = {
  current_ratio: { label: "نسبة التداول", type: "multiple" },
  quick_ratio: { label: "النسبة السريعة", type: "multiple" },
  roa: { label: "العائد على الأصول", type: "percent" },
  interest_coverage: { label: "تغطية التمويل", type: "multiple" },
};

const ASSISTANT_CONTEXT_EVENT = "financial-analysis-context";

const FETCH_COOLDOWN_MS = 15_000;
const FETCH_COOLDOWN_KEY = "financialBenchmarkYahooNextFetchAt";
const SITE_URL = "https://ratios-ashy.vercel.app";

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
const companyInfoPanel = document.querySelector("#companyInfoPanel");
const dividendHistoryPanel = document.querySelector("#dividendHistoryPanel");
const dividendHistoryRows = document.querySelector("#dividendHistoryRows");
const dividendTableWrap = document.querySelector("#dividendTableWrap");
const dividendHistoryEmpty = document.querySelector("#dividendHistoryEmpty");
const shareAnalysisPanel = document.querySelector("#shareAnalysisPanel");
const shareAnalysisLauncher = document.querySelector("#shareAnalysisLauncher");
const shareAnalysisModal = document.querySelector("#shareAnalysisModal");
const openShareAnalysisButton = document.querySelector("#openShareAnalysisButton");
const closeShareAnalysisButton = document.querySelector("#closeShareAnalysisButton");
const shareAnalysisButton = document.querySelector("#shareAnalysisButton");
const downloadAnalysisButton = document.querySelector("#downloadAnalysisButton");
const copyCompanyLinkButton = document.querySelector("#copyCompanyLinkButton");
const shareAnalysisFeedback = document.querySelector("#shareAnalysisFeedback");
const companyTypeInput = document.querySelector("#companyType");
const companyTypeHelp = document.querySelector("#companyTypeHelp");
const bankFieldsBlock = document.querySelector("#bankFieldsBlock");
const financialPositionPanel = document.querySelector("#financialPositionPanel");
const valuationRatioPanel = document.querySelector("#valuationRatioPanel");
const operationsRatioPanel = document.querySelector("#operationsRatioPanel");

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
  netInterestIncome: "صافي دخل العمولات الخاصة",
  averageEarningAssets: "متوسط الأصول المدرة للدخل",
  operatingExpenses: "المصروفات التشغيلية",
  operatingIncome: "الدخل التشغيلي",
  totalLoans: "إجمالي القروض والسلف",
  customerDeposits: "ودائع العملاء",
  nonPerformingLoans: "القروض غير العاملة",
  loanLossProvisions: "مخصصات خسائر الائتمان",
  regulatoryCapital: "رأس المال التنظيمي",
  riskWeightedAssets: "الأصول المرجحة بالمخاطر",
};

const OPERATING_ONLY_FIELDS = Object.freeze([
  "revenue",
  "costOfSales",
  "operatingProfit",
  "currentAssets",
  "inventory",
  "currentLiabilities",
  "totalDebt",
  "operatingCashFlow",
  "interestExpense",
  "freeCashFlow",
  "enterpriseValue",
  "ebitda",
  "cashAndEquivalents",
  "previousInventory",
  "earningsGrowthPercent",
]);

const BANK_ONLY_FIELDS = Object.freeze([
  "netInterestIncome",
  "averageEarningAssets",
  "operatingExpenses",
  "operatingIncome",
  "totalLoans",
  "customerDeposits",
  "nonPerformingLoans",
  "loanLossProvisions",
  "regulatoryCapital",
  "riskWeightedAssets",
]);

const OPERATING_REQUIRED_FIELDS = Object.freeze([
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
]);

const COMMON_REQUIRED_FIELDS = Object.freeze(["netProfit", "totalAssets", "equity"]);
const UNCLASSIFIED_ADVANCED_CODES = new Set([
  "market_cap",
  "pe",
  "pb",
  "dividend_yield",
  "dividend_payout",
]);

const numberFormatter = new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 });
const compactNumberFormatter = new Intl.NumberFormat("ar-SA", {
  maximumFractionDigits: 2,
  notation: "compact",
});
let fetchInProgress = false;
let cooldownTimer = 0;
let nextFetchAt = readCooldownDeadline();
let currencyUnit = "ر.س";
let importedCompanyContext = null;
let latestShareState = null;
let shareModalReturnFocus = null;

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

function normalizeCompanyType(value) {
  return ["operating", "bank", "unclassified"].includes(value) ? value : "";
}

function currentCompanyType() {
  return normalizeCompanyType(companyTypeInput?.value);
}

function requiredFieldsFor(companyType) {
  return companyType === "operating" ? [...OPERATING_REQUIRED_FIELDS] : [...COMMON_REQUIRED_FIELDS];
}

function applicableFieldsFor(companyType) {
  const allFields = Object.keys(importedFieldLabels);
  if (companyType === "bank") return allFields.filter((key) => !OPERATING_ONLY_FIELDS.includes(key));
  if (companyType === "unclassified") {
    return allFields.filter((key) => !OPERATING_ONLY_FIELDS.includes(key) && !BANK_ONLY_FIELDS.includes(key));
  }
  return allFields.filter((key) => !BANK_ONLY_FIELDS.includes(key));
}

function ratioFieldApiFor(companyType) {
  return companyType === "bank" ? bankRatioApi : advancedRatioApi;
}

function fieldLabelFor(fieldName, companyType = currentCompanyType()) {
  return ratioFieldApiFor(companyType)?.fieldLabels?.[fieldName]
    || importedFieldLabels[fieldName]
    || fieldName;
}

function setFieldVisibility(fieldName, visible) {
  const input = document.querySelector(`#${fieldName}`);
  const field = input?.closest(".field");
  if (!input || !field) return;
  field.hidden = !visible;
  input.disabled = !visible;
}

function setCompanyType(value, { hideResults = false } = {}) {
  const companyType = normalizeCompanyType(value);
  if (companyTypeInput) companyTypeInput.value = companyType;

  OPERATING_ONLY_FIELDS.forEach((fieldName) => setFieldVisibility(fieldName, companyType === "operating"));
  BANK_ONLY_FIELDS.forEach((fieldName) => setFieldVisibility(fieldName, companyType === "bank"));
  if (bankFieldsBlock) bankFieldsBlock.hidden = companyType !== "bank";

  Object.keys(importedFieldLabels).forEach((fieldName) => {
    const input = document.querySelector(`#${fieldName}`);
    if (input) input.required = false;
  });
  if (companyType) {
    requiredFieldsFor(companyType).forEach((fieldName) => {
      const input = document.querySelector(`#${fieldName}`);
      if (input && !input.disabled) input.required = true;
    });
  }

  if (companyTypeHelp) {
    companyTypeHelp.textContent = companyType === "bank"
      ? "وضع البنوك مفعّل: تظهر مؤشرات مصرفية وتُستبعد نسب السيولة التشغيلية."
      : companyType === "operating"
        ? "تظهر نسب الربحية والسيولة والمديونية والتشغيل."
        : companyType === "unclassified"
          ? "ستظهر المؤشرات المشتركة فقط حتى تختار نوعًا أدق."
          : "عند الجلب التلقائي يحدد الموقع نوع المنشأة، ويمكنك مراجعته.";
  }

  if (importedCompanyContext && companyType) importedCompanyContext.companyType = companyType;
  if (hideResults) {
    resultsSection.hidden = true;
    shareAnalysisLauncher.hidden = true;
    closeShareModal();
    publishAssistantContext(null);
  }
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

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function cleanCompanySymbol(value) {
  const match = String(value || "").match(/(\d{4})/);
  return match ? match[1] : "";
}

function companyUrlFor(symbol) {
  const cleanSymbol = cleanCompanySymbol(symbol);
  return cleanSymbol ? `${SITE_URL}/company/${cleanSymbol}` : SITE_URL;
}

function updateCompanyLocation(data, addHistoryEntry = true) {
  const symbol = cleanCompanySymbol(data?.symbol);
  if (!symbol) return;

  const companyUrl = `/company/${symbol}`;
  if (window.history && typeof window.history.pushState === "function") {
    const currentPath = window.location.pathname || "/";
    if (currentPath !== companyUrl) {
      const method = addHistoryEntry ? "pushState" : "replaceState";
      window.history[method]({}, "", companyUrl);
    }
  }

  const companyName = data.companyName || data.shortName || symbol;
  document.title = `تحليل ${companyName} (${symbol}) والنسب المالية | محلل النسب المالية`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = companyUrlFor(symbol);
}

function formatDividendAmount(value) {
  return `${numberFormatter.format(value)} ${currencyUnit}`;
}

function formatAnnualDividendChange(item) {
  const amount = item.annualChangeAmount;
  if (amount === null || !Number.isFinite(amount)) return "سنة الأساس";
  if (amount === 0) return "دون تغير";

  const direction = amount > 0 ? "زيادة" : "انخفاض";
  const amountText = formatDividendAmount(Math.abs(amount));
  const percent = item.annualChangePercent;
  if (percent === null || !Number.isFinite(percent)) return `${direction} ${amountText} دون أساس نسبي`;
  return `${direction} ${amountText} (${numberFormatter.format(Math.abs(percent))}٪)`;
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
    document.querySelector(`#${id}`)?.closest(".field")?.classList.remove("auto-filled", "missing-field");
  });
}

function clearFinancialFields() {
  Object.keys(importedFieldLabels).forEach((id) => {
    const input = document.querySelector(`#${id}`);
    if (input) input.value = "";
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

  const importedCompanyType = normalizeCompanyType(data.companyType) || "operating";

  importedCompanyContext = {
    symbol: data.symbol || "",
    companyName: data.companyName || data.symbol || "",
    companyInfo: data.companyInfo || {},
    dividendHistory: data.dividendHistory || null,
    currency: data.currency || "SAR",
    period: data.period || "",
    periodEnd: data.periodEnd || "",
    missingFields: Array.isArray(data.missingFields) ? data.missingFields : [],
    source: data.source || {},
    companyType: importedCompanyType,
  };

  setCompanyType(importedCompanyType);

  resultsSection.hidden = true;
  publishAssistantContext(null);

  document.querySelector("#projectName").value = data.companyName || data.symbol;
  updateCurrencyUnits(data.currency);

  const applicableKeys = applicableFieldsFor(importedCompanyType);
  Object.entries(importedFieldLabels).forEach(([id]) => {
    const input = document.querySelector(`#${id}`);
    if (!input) return;
    const value = data.fields?.[id];
    const field = input.closest(".field");
    if (typeof value === "number" && Number.isFinite(value)) {
      input.value = String(value);
      field?.classList.add("auto-filled");
    } else {
      input.value = "";
      if (applicableKeys.includes(id)) field?.classList.add("missing-field");
    }
  });

  const missingKeys = applicableKeys.filter((key) => {
    const value = data.fields?.[key];
    return typeof value !== "number" || !Number.isFinite(value);
  });
  const missingLabels = missingKeys.map((key) => importedFieldLabels[key]);
  const availableFieldCount = applicableKeys.length - missingKeys.length;
  document.querySelector("#importCompanyName").textContent = data.companyName || data.symbol;
  const typeLabel = importedCompanyType === "bank" ? "بنك" : "شركة تشغيلية";
  document.querySelector("#importCompanyMeta").textContent = `الرمز: ${data.symbol || "غير محدد"} · النوع: ${typeLabel}`;
  document.querySelector("#importSourceBadge").textContent = `المصدر: ${data.source?.provider || "غير محدد"}`;
  document.querySelector("#importPeriodBadge").textContent = `السنة المالية: ${data.period || "غير محددة"}`;
  document.querySelector("#importCurrencyBadge").textContent = `العملة: ${data.currency || "غير محددة"}`;
  document.querySelector("#importCoverageBadge").textContent = `تم جلب ${availableFieldCount} من ${applicableKeys.length} حقلًا`;
  document.querySelector("#importSourceLink").href = data.source?.url || "#";

  const notes = [];
  if (missingLabels.length) {
    notes.push(`الحقول التي لم يوفرها Yahoo Finance: ${missingLabels.join("، ")}.`);
  } else {
    notes.push(`اكتملت جميع الحقول المناسبة لوضع ${typeLabel}.`);
  }
  notes.push("راجع الأرقام مع القوائم المنشورة قبل اعتماد النتيجة.");
  document.querySelector("#importMissingNote").textContent = notes.join(" ");
  importSummary.hidden = false;

  const requiredMissing = requiredFieldsFor(importedCompanyType).filter((key) => missingKeys.includes(key));

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
    updateCompanyLocation(payload);
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
  const averageEquity = values.previousEquity !== null
    ? (values.equity + values.previousEquity) / 2
    : values.equity;
  const operatingMode = values.companyType === "operating";

  return {
    gross_margin: operatingMode && values.revenue !== 0 ? (values.revenue - values.costOfSales) / values.revenue : null,
    operating_margin: operatingMode && values.revenue !== 0 ? values.operatingProfit / values.revenue : null,
    net_margin: operatingMode && values.revenue !== 0 ? values.netProfit / values.revenue : null,
    current_ratio: operatingMode && values.currentLiabilities !== 0 ? values.currentAssets / values.currentLiabilities : null,
    quick_ratio: operatingMode && values.currentLiabilities !== 0
      ? (values.currentAssets - values.inventory) / values.currentLiabilities
      : null,
    debt_to_equity: operatingMode && values.equity !== 0 ? values.totalDebt / values.equity : null,
    roa: averageAssets !== 0 ? values.netProfit / averageAssets : null,
    roe: averageEquity !== 0 ? values.netProfit / averageEquity : null,
    interest_coverage: operatingMode && values.interestExpense > 0
      ? values.operatingProfit / values.interestExpense
      : null,
    cash_quality:
      operatingMode && values.operatingCashFlow !== null && values.netProfit !== 0
        ? values.operatingCashFlow / values.netProfit
        : null,
  };
}

function renderPrimaryRatios(ratios, companyType) {
  ratioGrid.replaceChildren();

  const definitions = companyType === "operating" ? ratioMeta : commonRatioMeta;
  Object.entries(definitions).forEach(([code, meta]) => {
    const card = document.createElement("article");
    card.className = "ratio-result-card";

    const title = document.createElement("span");
    title.textContent = meta.label;
    const value = document.createElement("strong");
    value.textContent = formatRatio(ratios[code], meta.type);
    const formula = document.createElement("p");
    formula.className = "ratio-formula";
    formula.textContent = `طريقة الحساب: ${meta.formula}`;
    const note = document.createElement("p");
    note.className = "ratio-result-note";
    const interpretation = ratios[code] < 0 && meta.negativeDescription
      ? meta.negativeDescription
      : meta.description;
    note.textContent = `التفسير المبسط: ${interpretation}`;

    card.append(title, value, formula, note);
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
  const formula = document.createElement("p");
  formula.className = "ratio-formula";
  formula.textContent = `طريقة الحساب: ${item.formula}`;
  const description = document.createElement("p");
  description.className = "ratio-result-note";
  const interpretation = item.status === "available" && item.value < 0
    ? item.negativeDescription || "النتيجة سالبة بسبب وجود قيمة سالبة ضمن عناصر المعادلة."
    : item.description;
  description.textContent = `التفسير المبسط: ${interpretation}`;
  card.append(title, english, value, formula, description);

  if (item.status === "available") {
    value.textContent = formatAdvancedValue(item.value, item.type);
    return card;
  }

  const status = document.createElement("p");
  status.className = "ratio-data-status";
  if (item.status === "missing") {
    value.textContent = "بيانات ناقصة";
    const labels = item.missingFields.map((key) => fieldLabelFor(key));
    status.textContent = `ينقص: ${labels.join("، ")}.`;
  } else {
    value.textContent = "غير قابل للحساب";
    status.textContent = item.invalidReason;
  }
  card.append(status);
  return card;
}

function renderAdvancedRatios(values, ratios) {
  const companyType = values.companyType;
  const results = companyType === "bank"
    ? bankRatioApi.calculate(values)
    : advancedRatioApi.calculate(values).filter((item) => (
      companyType === "operating" || UNCLASSIFIED_ADVANCED_CODES.has(item.code)
    ));
  valuationRatioGrid.replaceChildren();
  operationsRatioGrid.replaceChildren();

  results.forEach((item) => {
    const target = item.group === "valuation" ? valuationRatioGrid : operationsRatioGrid;
    target.append(renderAdvancedCard(item));
  });

  financialPositionPanel.hidden = companyType !== "operating";
  operationsRatioPanel.hidden = companyType === "unclassified";
  valuationRatioPanel.hidden = false;
  setText("valuationRatioTitle", companyType === "bank" ? "التقييم والتوزيعات للبنك" : "التقييم والتوزيعات");
  setText("operationsRatioKicker", companyType === "bank" ? "الجودة والكفاءة ورأس المال" : "الكفاءة والتمويل");
  setText("operationsRatioTitle", companyType === "bank" ? "مؤشرات مصرفية متقدمة" : "مؤشرات تشغيلية متقدمة");

  const missingResults = [...results];
  if (companyType === "operating" && ratios.interest_coverage === null && values.interestExpense === null) {
    missingResults.push({ status: "missing", missingFields: ["interestExpense"] });
  }
  renderMissingFields(missingResults, companyType);
}

function unitLabelFor(fieldName, companyType) {
  const unit = ratioFieldApiFor(companyType)?.inputMeta?.[fieldName]?.unit;
  if (unit === "percent") return "٪";
  if (unit === "currency_per_share") return `${currencyUnit} للسهم`;
  return currencyUnit;
}

function renderMissingFields(results, companyType) {
  const fieldApi = ratioFieldApiFor(companyType);
  const missingFields = [
    ...new Set(
      results
        .filter((item) => item.status === "missing")
        .flatMap((item) => item.missingFields)
        .filter((fieldName) => fieldApi?.fieldLabels?.[fieldName] || importedFieldLabels[fieldName]),
    ),
  ];

  missingFieldsGrid.replaceChildren();
  missingDataPanel.hidden = missingFields.length === 0;
  if (!missingFields.length) return;

  missingFields.forEach((fieldName) => {
    const meta = fieldApi?.inputMeta?.[fieldName] || {};
    const label = document.createElement("label");
    label.className = "missing-input-card";
    const title = document.createElement("span");
    title.textContent = fieldLabelFor(fieldName, companyType);
    const helper = document.createElement("small");
    helper.textContent = "أدخل القيمة من القوائم أو المصدر الرسمي.";
    const wrap = document.createElement("div");
    wrap.className = "missing-input-wrap";
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.dataset.field = fieldName;
    input.setAttribute("aria-label", fieldLabelFor(fieldName, companyType));
    if (typeof meta.min === "number") input.min = String(meta.min);
    const savedValue = document.querySelector(`#${fieldName}`)?.value;
    if (savedValue) input.value = savedValue;
    const unit = document.createElement("b");
    unit.textContent = unitLabelFor(fieldName, companyType);
    wrap.append(input, unit);
    label.append(title, helper, wrap);
    missingFieldsGrid.append(label);
  });
}

function renderCompanyInfo() {
  if (!importedCompanyContext) {
    companyInfoPanel.hidden = true;
    return;
  }

  const info = importedCompanyContext.companyInfo || {};
  setText("companySector", info.sector || "غير متوفر");
  setText("companyIndustry", info.industry || "غير متوفر");
  setText("companyDescription", info.description || "لم يوفر Yahoo Finance وصفًا لنشاط الشركة.");

  const websiteElement = document.querySelector("#companyWebsite");
  const website = safeHttpUrl(info.website);
  if (website) {
    websiteElement.href = website.href;
    websiteElement.target = "_blank";
    websiteElement.rel = "noopener noreferrer";
    websiteElement.textContent = website.hostname.replace(/^www\./, "");
  } else {
    websiteElement.removeAttribute("href");
    websiteElement.removeAttribute("target");
    websiteElement.removeAttribute("rel");
    websiteElement.textContent = "غير متوفر";
  }

  companyInfoPanel.hidden = false;
}

function renderDividendHistory() {
  if (!importedCompanyContext) {
    dividendHistoryPanel.hidden = true;
    return;
  }

  const history = importedCompanyContext.dividendHistory;
  dividendHistoryRows.replaceChildren();
  dividendHistoryPanel.hidden = false;

  if (!history || history.status !== "available" || !Array.isArray(history.years)) {
    setText("dividendRegularity", "غير متوفر");
    setText("dividendRegularityDetail", "تعذر جلب السجل من Yahoo Finance مع بقاء النسب قابلة للحساب.");
    dividendHistoryEmpty.textContent = "سجل التوزيعات غير متوفر حاليًا من مصدر البيانات.";
    dividendHistoryEmpty.hidden = false;
    dividendTableWrap.hidden = true;
    return;
  }

  setText("dividendRegularity", history.regularity || "غير متوفر");
  setText(
    "dividendRegularityDetail",
    `تم رصد توزيعات في ${numberFormatter.format(history.yearsWithDividends || 0)} من ${numberFormatter.format(history.evaluatedYears || 0)} سنوات مكتملة.`,
  );
  dividendHistoryEmpty.hidden = true;
  dividendTableWrap.hidden = false;

  history.years.forEach((item) => {
    const row = document.createElement("tr");
    const year = document.createElement("th");
    year.scope = "row";
    year.textContent = item.isPartial ? `${item.year} (حتى تاريخه)` : String(item.year);

    const amount = document.createElement("td");
    amount.textContent = formatDividendAmount(item.totalPerShare || 0);
    const payments = document.createElement("td");
    payments.textContent = numberFormatter.format(item.paymentCount || 0);
    const change = document.createElement("td");
    change.textContent = formatAnnualDividendChange(item);
    if (item.annualChangeAmount > 0) change.className = "positive-change";
    if (item.annualChangeAmount < 0) change.className = "negative-change";

    row.append(year, amount, payments, change);
    dividendHistoryRows.append(row);
  });
}

function shareMetrics(values, ratios) {
  if (values.companyType === "bank") {
    const bankResults = Object.fromEntries(bankRatioApi.calculate(values).map((item) => [item.code, item]));
    return [
      { label: "هامش صافي العمولات", value: bankResults.nim?.value, type: "percent" },
      { label: "القروض غير العاملة", value: bankResults.npl?.value, type: "percent" },
      { label: "القروض إلى الودائع", value: bankResults.loan_deposit?.value, type: "percent" },
      { label: "العائد على حقوق الملكية", value: ratios.roe, type: "percent" },
      { label: "العائد على الأصول", value: ratios.roa, type: "percent" },
      { label: "السعر إلى القيمة الدفترية", value: bankResults.pb?.value, type: "multiple" },
    ].filter((item) => Number.isFinite(item.value)).slice(0, 3);
  }

  const commonMarketResults = Object.fromEntries(
    advancedRatioApi.calculate(values).map((item) => [item.code, item]),
  );
  const candidates = values.companyType === "unclassified"
    ? [
      { label: "العائد على حقوق الملكية", value: ratios.roe, type: "percent" },
      { label: "العائد على الأصول", value: ratios.roa, type: "percent" },
      { label: "مضاعف الربحية", value: commonMarketResults.pe?.value, type: "multiple" },
    ]
    : [
      { label: "هامش صافي الربح", value: ratios.net_margin, type: "percent" },
      { label: "العائد على حقوق الملكية", value: ratios.roe, type: "percent" },
      { label: "الديون إلى حقوق الملكية", value: ratios.debt_to_equity, type: "multiple" },
      { label: "نسبة التداول", value: ratios.current_ratio, type: "multiple" },
    ];
  return candidates.filter((item) => Number.isFinite(item.value)).slice(0, 3);
}

function dividendShareSummary() {
  const history = importedCompanyContext?.dividendHistory;
  if (!history || history.status !== "available") return "سجل التوزيعات غير متوفر";
  return `انتظام التوزيع: ${history.regularity || "غير متوفر"}`;
}

function showShareFeedback(text, isError = false) {
  if (!shareAnalysisFeedback) return;
  shareAnalysisFeedback.textContent = text;
  shareAnalysisFeedback.classList.toggle("is-error", isError);
}

function openShareModal() {
  if (!latestShareState || !shareAnalysisModal) return;
  shareModalReturnFocus = document.activeElement;
  shareAnalysisModal.hidden = false;
  document.body.classList.add("share-modal-open");
  closeShareAnalysisButton?.focus();
}

function closeShareModal() {
  if (!shareAnalysisModal || shareAnalysisModal.hidden) return;
  shareAnalysisModal.hidden = true;
  document.body.classList.remove("share-modal-open");
  if (shareModalReturnFocus instanceof HTMLElement) shareModalReturnFocus.focus();
  shareModalReturnFocus = null;
}

function renderSharePanel(values, ratios) {
  if (!shareAnalysisPanel) {
    latestShareState = null;
    return;
  }

  const imported = importedCompanyContext;
  const symbol = cleanCompanySymbol(imported?.symbol);
  const companyName = values.projectName || imported?.companyName || symbol || "تحليل مالي";
  const permalink = symbol ? companyUrlFor(symbol) : SITE_URL;
  const period = imported?.period || "غير محددة";
  const dividendSummary = dividendShareSummary();
  const typeLabel = values.companyType === "bank"
    ? "تحليل بنك"
    : values.companyType === "operating"
      ? "شركة تشغيلية"
      : "تحليل مشترك";

  setText("sharePreviewSymbol", symbol ? `تداول: ${symbol}` : typeLabel);
  setText("sharePreviewCompany", companyName);
  setText("sharePreviewMeta", `السنة المالية ${period} · ${dividendSummary}`);
  const permalinkElement = document.querySelector("#companyPermalink");
  permalinkElement.href = permalink;
  permalinkElement.textContent = permalink;
  setText("companyPermalinkLabel", symbol ? "رابط التحليل الدائم" : "رابط الموقع");

  latestShareState = {
    companyName,
    symbol,
    period,
    permalink,
    dividendSummary,
    companyType: values.companyType,
    typeLabel,
    metrics: shareMetrics(values, ratios),
    source: imported?.source?.provider || "إدخال يدوي",
  };
  showShareFeedback("");
  closeShareModal();
  shareAnalysisLauncher.hidden = false;
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}

function fitCanvasText(context, text, maxWidth, maxSize, minSize = 30) {
  let size = maxSize;
  do {
    context.font = `800 ${size}px "Segoe UI", Tahoma, Arial, sans-serif`;
    if (context.measureText(text).width <= maxWidth) return size;
    size -= 2;
  } while (size > minSize);
  return minSize;
}

function drawMetricCard(context, metric, x, y, width) {
  fillRoundedRect(context, x, y, width, 210, 28, "rgba(255,255,255,.075)");
  context.strokeStyle = "rgba(255,255,255,.11)";
  context.lineWidth = 2;
  roundedRectPath(context, x, y, width, 210, 28);
  context.stroke();

  context.direction = "rtl";
  context.textAlign = "right";
  context.fillStyle = "rgba(255,255,255,.65)";
  context.font = '600 25px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(metric.label, x + width - 24, y + 58);
  context.fillStyle = "#ffffff";
  context.font = '800 39px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(formatRatio(metric.value, metric.type), x + width - 24, y + 126);
  context.fillStyle = "#5de0d0";
  context.font = '700 20px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("من النتائج الحالية", x + width - 24, y + 172);
}

async function createAnalysisImageBlob() {
  if (!latestShareState) throw new Error("احسب نتائج الشركة أولًا قبل إنشاء الصورة.");
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("المتصفح لا يدعم إنشاء صورة التحليل.");

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#13172f");
  background.addColorStop(.53, "#2b245a");
  background.addColorStop(1, "#123c49");
  context.fillStyle = background;
  context.fillRect(0, 0, 1080, 1350);

  const glowOne = context.createRadialGradient(130, 120, 10, 130, 120, 390);
  glowOne.addColorStop(0, "rgba(56,214,197,.42)");
  glowOne.addColorStop(1, "rgba(56,214,197,0)");
  context.fillStyle = glowOne;
  context.fillRect(0, 0, 650, 650);
  const glowTwo = context.createRadialGradient(940, 1040, 10, 940, 1040, 440);
  glowTwo.addColorStop(0, "rgba(139,105,244,.55)");
  glowTwo.addColorStop(1, "rgba(139,105,244,0)");
  context.fillStyle = glowTwo;
  context.fillRect(460, 560, 620, 790);

  fillRoundedRect(context, 56, 56, 968, 1238, 46, "rgba(255,255,255,.055)");
  context.strokeStyle = "rgba(255,255,255,.13)";
  context.lineWidth = 2;
  roundedRectPath(context, 56, 56, 968, 1238, 46);
  context.stroke();

  const brandGradient = context.createLinearGradient(868, 104, 950, 186);
  brandGradient.addColorStop(0, "#8b6ff4");
  brandGradient.addColorStop(1, "#35c8b8");
  fillRoundedRect(context, 900, 105, 74, 74, 22, brandGradient);
  context.direction = "rtl";
  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = '900 39px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("م", 937, 157);
  context.textAlign = "right";
  context.font = '800 30px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("محلل النسب المالية", 878, 137);
  context.fillStyle = "rgba(255,255,255,.54)";
  context.font = '600 18px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("تحليل مالي مبسّط وقابل للمشاركة", 878, 169);

  fillRoundedRect(context, 742, 220, 232, 57, 28, "rgba(255,255,255,.09)");
  context.fillStyle = "#d0c8ff";
  context.font = '800 23px "Segoe UI", Tahoma, Arial, sans-serif';
  const shareBadge = latestShareState.symbol ? `تداول: ${latestShareState.symbol}` : latestShareState.typeLabel;
  context.fillText(shareBadge, 946, 257);

  const titleSize = fitCanvasText(context, latestShareState.companyName, 870, 58, 34);
  context.fillStyle = "#ffffff";
  context.font = `800 ${titleSize}px "Segoe UI", Tahoma, Arial, sans-serif`;
  context.fillText(latestShareState.companyName, 974, 357);
  context.fillStyle = "rgba(255,255,255,.62)";
  context.font = '600 24px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(`نتائج السنة المالية ${latestShareState.period} · المصدر: ${latestShareState.source}`, 974, 407);

  context.fillStyle = "rgba(255,255,255,.13)";
  context.fillRect(106, 461, 868, 2);
  context.fillStyle = "#65e2d3";
  context.font = '800 25px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("أبرز المؤشرات", 974, 516);

  const metrics = latestShareState.metrics;
  const cardWidth = metrics.length === 1 ? 868 : metrics.length === 2 ? 422 : 274;
  const cardGap = 24;
  metrics.forEach((metric, index) => {
    const x = 106 + (metrics.length - 1 - index) * (cardWidth + cardGap);
    drawMetricCard(context, metric, x, 555, cardWidth);
  });

  fillRoundedRect(context, 106, 810, 868, 145, 28, "rgba(255,255,255,.075)");
  context.fillStyle = "rgba(255,255,255,.58)";
  context.font = '700 23px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("سجل التوزيعات", 936, 859);
  context.fillStyle = "#ffffff";
  context.font = '800 35px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(latestShareState.dividendSummary, 936, 914);

  fillRoundedRect(context, 106, 995, 868, 108, 25, "rgba(87,221,207,.1)");
  context.fillStyle = "#72e6d9";
  context.font = '800 25px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("اقرأ النسب في سياقها، وليس كأرقام منفردة.", 936, 1058);

  context.fillStyle = "rgba(255,255,255,.5)";
  context.font = '600 20px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("هذه النتائج تعليمية وتحليلية وليست توصية استثمارية.", 974, 1162);
  context.fillStyle = "rgba(255,255,255,.15)";
  context.fillRect(106, 1197, 868, 2);
  context.direction = "ltr";
  context.textAlign = "left";
  context.fillStyle = "#ffffff";
  context.font = '800 27px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("https://ratios-ashy.vercel.app/", 106, 1250);
  context.textAlign = "right";
  context.fillStyle = "rgba(255,255,255,.46)";
  context.font = '600 19px "Segoe UI", Tahoma, Arial, sans-serif';
  const today = new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(new Date());
  context.fillText(today, 974, 1248);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("تعذر تحويل البطاقة إلى صورة."));
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

function shareImageFilename() {
  return `تحليل-${latestShareState?.symbol || "مالي"}.png`;
}

async function downloadAnalysisImage() {
  downloadAnalysisButton.disabled = true;
  showShareFeedback("يجري تجهيز الصورة...");
  try {
    const blob = await createAnalysisImageBlob();
    downloadBlob(blob, shareImageFilename());
    showShareFeedback("تم تنزيل الصورة وأصبحت جاهزة للنشر.");
  } catch (error) {
    showShareFeedback(error.message || "تعذر إنشاء الصورة.", true);
  } finally {
    downloadAnalysisButton.disabled = false;
  }
}

async function shareAnalysisImage() {
  shareAnalysisButton.disabled = true;
  showShareFeedback("يجري تجهيز بطاقة المشاركة...");
  try {
    const blob = await createAnalysisImageBlob();
    const file = new File([blob], shareImageFilename(), { type: "image/png" });
    const shareData = {
      title: `تحليل ${latestShareState.companyName}`,
      text: `تحليل مالي مبسّط لشركة ${latestShareState.companyName}`,
      url: `${latestShareState.permalink}#results`,
      files: [file],
    };

    const supportsFileSharing = typeof navigator.share === "function"
      && (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));
    if (supportsFileSharing) {
      await navigator.share(shareData);
      showShareFeedback("تم فتح خيارات المشاركة.");
    } else {
      downloadBlob(blob, shareImageFilename());
      showShareFeedback("جهازك لا يدعم مشاركة الصور مباشرة؛ نُزّلت الصورة لتتمكن من نشرها.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") showShareFeedback(error.message || "تعذرت المشاركة.", true);
  } finally {
    shareAnalysisButton.disabled = false;
  }
}

async function copyCompanyLink() {
  if (!latestShareState) return;
  try {
    await navigator.clipboard.writeText(latestShareState.permalink);
    showShareFeedback("تم نسخ رابط تحليل الشركة.");
  } catch {
    showShareFeedback("تعذر النسخ تلقائيًا؛ يمكنك نسخ الرابط الظاهر يدويًا.", true);
  }
}

function assistantRatio(code, meta, value) {
  return {
    code,
    label: meta.label,
    type: meta.type,
    status: typeof value === "number" && Number.isFinite(value) ? "available" : "invalid",
    value: typeof value === "number" && Number.isFinite(value) ? value : null,
  };
}

function buildAssistantContext(values, ratios) {
  const primaryDefinitions = values.companyType === "operating" ? ratioMeta : commonRatioMeta;
  const primaryRatios = [
    ...Object.entries(primaryDefinitions).map(([code, meta]) => assistantRatio(code, meta, ratios[code])),
    ...(values.companyType === "operating"
      ? Object.entries(summaryRatioMeta).map(([code, meta]) => assistantRatio(code, meta, ratios[code]))
      : []),
  ];
  const calculatedAdvancedRatios = values.companyType === "bank"
    ? bankRatioApi.calculate(values)
    : advancedRatioApi.calculate(values).filter((item) => (
      values.companyType === "operating" || UNCLASSIFIED_ADVANCED_CODES.has(item.code)
    ));
  const advancedRatios = calculatedAdvancedRatios.map((item) => ({
    code: item.code,
    label: item.label,
    type: item.type,
    status: item.status,
    value: item.status === "available" ? item.value : null,
    missingFields: item.status === "missing" ? item.missingFields : [],
    invalidReason: item.status === "invalid" ? item.invalidReason : "",
  }));
  const imported = importedCompanyContext;

  return {
    schemaVersion: 1,
    sourceType: imported ? "yahoo" : "manual",
    companyType: values.companyType,
    company: {
      name: values.projectName || imported?.companyName || "النتائج الحالية",
      symbol: imported?.symbol || "",
      currency: imported?.currency || currencyUnit,
      period: imported?.period || "",
      periodEnd: imported?.periodEnd || "",
    },
    companyInfo: imported?.companyInfo || {},
    source: imported?.source || { provider: "إدخال يدوي" },
    missingFields: imported?.missingFields || [],
    financialInputs: Object.fromEntries(
      Object.entries(values).filter(([key, value]) => key !== "projectName" && (value === null || Number.isFinite(value))),
    ),
    ratios: [...primaryRatios, ...advancedRatios],
    dividendHistory: imported?.dividendHistory || null,
  };
}

function publishAssistantContext(context) {
  window.financialAnalysisContext = context;
  if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
  window.dispatchEvent(new window.CustomEvent(ASSISTANT_CONTEXT_EVENT, { detail: context }));
}

function renderResults(values, ratios, shouldScroll = true) {
  setText("resultTitle", values.projectName || "مشروعك");
  setText("currentRatioValue", formatRatio(ratios.current_ratio, "multiple"));
  setText("quickRatioValue", formatRatio(ratios.quick_ratio, "multiple"));
  setText("roaValue", formatRatio(ratios.roa, "percent"));
  setText("coverageValue", formatRatio(ratios.interest_coverage, "multiple"));
  setText(
    "resultSummary",
    values.companyType === "bank"
      ? "تم تطبيق وضع البنوك واستبعاد نسب الشركات التشغيلية غير المناسبة. تعتمد المؤشرات المصرفية على اكتمال بيانات القروض والودائع وجودة الائتمان ورأس المال، ويجب مراجعتها مع إفصاحات البنك الرسمية."
      : values.companyType === "unclassified"
        ? "تم عرض المؤشرات المشتركة فقط؛ اختر نوع المنشأة بدقة للحصول على مجموعة نسب أكثر ملاءمة."
        : "تم حساب المؤشرات من البيانات المتاحة والمدخلة. تعتمد مؤشرات التقييم السوقي على أحدث قيمة سوقية متاحة مع أحدث بيانات سنوية مكتملة؛ لذلك يجب مراجعة المصدر والقوائم الرسمية قبل تفسير النتائج.",
  );
  renderCompanyInfo();
  renderPrimaryRatios(ratios, values.companyType);
  renderAdvancedRatios(values, ratios);
  renderDividendHistory();
  renderSharePanel(values, ratios);

  resultsSection.hidden = false;
  publishAssistantContext(buildAssistantContext(values, ratios));
  if (shouldScroll) resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectValues() {
  return {
    companyType: currentCompanyType(),
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
    netInterestIncome: nullableValueOf("netInterestIncome"),
    averageEarningAssets: nullableValueOf("averageEarningAssets"),
    operatingExpenses: nullableValueOf("operatingExpenses"),
    operatingIncome: nullableValueOf("operatingIncome"),
    totalLoans: nullableValueOf("totalLoans"),
    customerDeposits: nullableValueOf("customerDeposits"),
    nonPerformingLoans: nullableValueOf("nonPerformingLoans"),
    loanLossProvisions: nullableValueOf("loanLossProvisions"),
    regulatoryCapital: nullableValueOf("regulatoryCapital"),
    riskWeightedAssets: nullableValueOf("riskWeightedAssets"),
  };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showMessage("");
  if (!form.reportValidity()) return;

  const values = collectValues();
  if (values.companyType === "operating" && values.inventory > values.currentAssets) {
    showMessage("المخزون لا يمكن أن يكون أكبر من إجمالي الأصول المتداولة.", "error");
    return;
  }
  if (values.companyType === "operating" && values.totalDebt > values.totalAssets * 5) {
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
      showMessage(`راجع قيمة ${fieldLabelFor(input.dataset.field)}.`, "error");
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
  importedCompanyContext = null;
  publishAssistantContext(null);
  companyInfoPanel.hidden = true;
  dividendHistoryPanel.hidden = true;
  dividendHistoryRows.replaceChildren();
  if (shareAnalysisLauncher) shareAnalysisLauncher.hidden = true;
  closeShareModal();
  latestShareState = null;
  showMessage("");
  resetImportPresentation();
  missingDataPanel.hidden = true;
  missingFieldsGrid.replaceChildren();
  setCompanyType("");
  updateCurrencyUnits("SAR");
  updateFetchButton();
  if (window.history && typeof window.history.pushState === "function" && /^\/company\//.test(window.location.pathname || "")) {
    window.history.pushState({}, "", "/");
    document.title = "محلل النسب المالية";
  }
  document.querySelector("#calculator").scrollIntoView({ behavior: "smooth", block: "start" });
});

fetchCompanyButton.addEventListener("click", fetchCompanyData);
companyTypeInput?.addEventListener("change", () => setCompanyType(companyTypeInput.value, { hideResults: true }));
tickerInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    fetchCompanyData();
  }
});

shareAnalysisButton?.addEventListener("click", shareAnalysisImage);
downloadAnalysisButton?.addEventListener("click", downloadAnalysisImage);
copyCompanyLinkButton?.addEventListener("click", copyCompanyLink);
openShareAnalysisButton?.addEventListener("click", openShareModal);
closeShareAnalysisButton?.addEventListener("click", closeShareModal);
shareAnalysisModal?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.hasAttribute("data-close-share-modal")) closeShareModal();
});
document.addEventListener?.("keydown", (event) => {
  if (event.key === "Escape" && !shareAnalysisModal?.hidden) closeShareModal();
});

function readCompanyBootstrap() {
  const element = document.querySelector("#companyBootstrap");
  if (!element?.textContent) return null;
  try {
    return JSON.parse(element.textContent);
  } catch {
    return null;
  }
}

function initializeCompanyPage() {
  const payload = readCompanyBootstrap();
  if (!payload) return;

  tickerInput.value = cleanCompanySymbol(payload.symbol);
  applyImportedData(payload);
  updateCompanyLocation(payload, false);

  const requiredFields = requiredFieldsFor(currentCompanyType());
  const canCalculate = requiredFields.every((key) => Number.isFinite(payload.fields?.[key]));
  if (canCalculate) {
    const values = collectValues();
    renderResults(values, calculate(values), false);
    showFetchStatus("تم تحميل صفحة الشركة ونتائجها من الرابط الدائم.", "success");
    if (window.location.hash === "#results") {
      window.setTimeout(() => resultsSection.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    }
  }
}

setCompanyType("");
updateFetchButton();
initializeCompanyPage();
