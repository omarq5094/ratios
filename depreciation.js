import { calculateDepreciation } from "./lib/depreciation-calculator.js";

const METHOD_LABELS = {
  straight_line: "القسط الثابت",
  double_declining: "الرصيد المتناقص المضاعف",
  units_of_production: "وحدات الإنتاج",
};
const DEFAULT_ASSET_DETAILS = Object.freeze({
  assetName: "آلة إنتاج",
  assetAccount: "الآلات",
  counterAccount: "النقدية",
});
const CONTEXT_EVENT = "accounting-analysis-context";
const form = document.querySelector("#depreciationForm");
const methodInputs = [...document.querySelectorAll('input[name="depreciationMethod"]')];
const unitsFields = document.querySelector("#unitsFields");
const resultsSection = document.querySelector("#depreciationResults");
const errorBox = document.querySelector("#depreciationError");
const scheduleBody = document.querySelector("#depreciationScheduleBody");
const periodSelect = document.querySelector("#journalPeriod");
const journalPurchase = document.querySelector("#purchaseJournalEntry");
const journalDepreciation = document.querySelector("#depreciationJournalEntry");
let latestCalculation = null;

function valueOf(id) {
  return document.querySelector(`#${id}`)?.value ?? "";
}

function selectedMethod() {
  return methodInputs.find((input) => input.checked)?.value || "straight_line";
}

function formatMoney(value) {
  return new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}

function updateHeroPreview() {
  const cost = Number(valueOf("assetCost"));
  const residualValue = Number(valueOf("residualValue"));
  const valid = Number.isFinite(cost)
    && Number.isFinite(residualValue)
    && cost > 0
    && residualValue >= 0
    && residualValue <= cost;
  setText("heroDepreciableValue", valid ? formatMoney(cost - residualValue) : "—");
}

function setText(id, text) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = text;
}

function showError(message = "") {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function updateMethodFields() {
  const method = selectedMethod();
  unitsFields.hidden = method !== "units_of_production";
  methodInputs.forEach((input) => input.closest("label")?.classList.toggle("is-selected", input.checked));
  if (method === "units_of_production") {
    document.querySelector("#totalUnits").required = true;
    document.querySelector("#producedUnits").required = true;
  } else {
    document.querySelector("#totalUnits").required = false;
    document.querySelector("#producedUnits").required = false;
  }
}

function collectInput() {
  return {
    method: selectedMethod(),
    cost: valueOf("assetCost"),
    residualValue: valueOf("residualValue"),
    usefulLife: valueOf("usefulLife"),
    totalUnits: valueOf("totalUnits"),
    producedUnits: valueOf("producedUnits"),
  };
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function renderSchedule(schedule) {
  scheduleBody.replaceChildren();
  periodSelect.replaceChildren();
  schedule.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.dataset.periodIndex = String(index);
    tr.append(
      createCell(row.label),
      createCell(formatMoney(row.openingBookValue)),
      createCell(formatMoney(row.depreciation)),
      createCell(formatMoney(row.accumulatedDepreciation)),
      createCell(formatMoney(row.closingBookValue)),
    );
    tr.addEventListener("click", () => {
      periodSelect.value = String(index);
      renderJournal(index);
    });
    scheduleBody.append(tr);

    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = row.label;
    periodSelect.append(option);
  });
}

function journalText(debitAccount, creditAccount, amount) {
  return `${formatMoney(amount)} من حـ/ ${debitAccount}\n${formatMoney(amount)} إلى حـ/ ${creditAccount}`;
}

function currentAssetDetails(fillEmptyFields = false) {
  const resolved = {};
  for (const [field, fallback] of Object.entries(DEFAULT_ASSET_DETAILS)) {
    const input = document.querySelector(`#${field}`);
    const entered = String(input?.value || "").trim().slice(0, 80);
    resolved[field] = entered || fallback;
    if (fillEmptyFields && input && !entered) input.value = fallback;
  }
  const { assetName, assetAccount, counterAccount } = resolved;
  return { assetName, assetAccount, counterAccount };
}

function renderJournal(index = 0) {
  if (!latestCalculation) return;
  const row = latestCalculation.schedule[index] || latestCalculation.schedule[0];
  const asset = currentAssetDetails();
  journalPurchase.textContent = journalText(asset.assetAccount, asset.counterAccount, latestCalculation.input.cost);
  journalDepreciation.textContent = journalText(`مصروف إهلاك ${asset.assetAccount}`, `مجمع إهلاك ${asset.assetAccount}`, row.depreciation);
  setText("selectedJournalLabel", row.label);
  publishAssistantContext(index);
}

function renderResult(calculation) {
  const firstRow = calculation.schedule[0];
  const methodLabel = METHOD_LABELS[calculation.input.method];
  setText("resultMethod", methodLabel);
  setText("depreciableAmount", `${formatMoney(calculation.depreciableAmount)} ريال`);
  setText("firstPeriodDepreciation", `${formatMoney(firstRow.depreciation)} ريال`);
  setText("closingBookValue", `${formatMoney(firstRow.closingBookValue)} ريال`);
  setText("calculationFormula", calculation.formula);
  setText("calculationSummary", calculation.summary);

  const secondaryLabel = calculation.input.method === "straight_line"
    ? `الإهلاك الشهري: ${formatMoney(calculation.monthlyDepreciation)} ريال`
    : calculation.input.method === "double_declining"
      ? `معدل الإهلاك: ${formatMoney(calculation.decliningRate * 100)}%`
      : `إهلاك الوحدة: ${formatMoney(calculation.depreciationPerUnit)} ريال`;
  setText("secondaryResult", secondaryLabel);
  renderSchedule(calculation.schedule);
  renderJournal(0);
  resultsSection.hidden = false;
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function assistantContext(selectedIndex = 0) {
  if (!latestCalculation) return null;
  const selected = latestCalculation.schedule[selectedIndex] || latestCalculation.schedule[0];
  const asset = currentAssetDetails();
  return {
    schemaVersion: 1,
    contextType: "depreciation",
    method: latestCalculation.input.method,
    methodLabel: METHOD_LABELS[latestCalculation.input.method],
    asset,
    inputs: latestCalculation.input,
    result: {
      depreciableAmount: latestCalculation.depreciableAmount,
      annualDepreciation: latestCalculation.annualDepreciation ?? null,
      monthlyDepreciation: latestCalculation.monthlyDepreciation ?? null,
      decliningRate: latestCalculation.decliningRate ?? null,
      depreciationPerUnit: latestCalculation.depreciationPerUnit ?? null,
      currentPeriodDepreciation: latestCalculation.currentPeriodDepreciation ?? selected.depreciation,
      selectedPeriod: selected.label,
    },
    schedule: latestCalculation.schedule,
    journalEntries: [
      { title: "قيد شراء الأصل", debitAccount: asset.assetAccount, creditAccount: asset.counterAccount, amount: latestCalculation.input.cost },
      { title: `قيد الإهلاك - ${selected.label}`, debitAccount: `مصروف إهلاك ${asset.assetAccount}`, creditAccount: `مجمع إهلاك ${asset.assetAccount}`, amount: selected.depreciation },
    ],
    explanation: { formula: latestCalculation.formula, summary: latestCalculation.summary },
  };
}

function publishAssistantContext(selectedIndex = 0) {
  const context = assistantContext(selectedIndex);
  window.accountingAnalysisContext = context;
  window.dispatchEvent(new CustomEvent(CONTEXT_EVENT, { detail: context }));
}

async function copyEntry(targetId, button) {
  const text = document.querySelector(`#${targetId}`)?.textContent || "";
  try {
    await navigator.clipboard.writeText(text);
    const previous = button.textContent;
    button.textContent = "تم النسخ";
    window.setTimeout(() => { button.textContent = previous; }, 1500);
  } catch {
    showError("تعذر النسخ تلقائيًا. حدّد القيد وانسخه يدويًا.");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showError();
  if (!form.reportValidity()) return;
  try {
    currentAssetDetails(true);
    latestCalculation = calculateDepreciation(collectInput());
    renderResult(latestCalculation);
  } catch (error) {
    latestCalculation = null;
    resultsSection.hidden = true;
    publishAssistantContext();
    showError(error instanceof Error ? error.message : "تعذر حساب الإهلاك. راجع البيانات.");
  }
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    latestCalculation = null;
    resultsSection.hidden = true;
    showError();
    updateMethodFields();
    updateHeroPreview();
    publishAssistantContext();
  });
});
methodInputs.forEach((input) => input.addEventListener("change", updateMethodFields));
document.querySelector("#assetCost").addEventListener("input", updateHeroPreview);
document.querySelector("#residualValue").addEventListener("input", updateHeroPreview);
periodSelect.addEventListener("change", () => renderJournal(Number(periodSelect.value)));
document.querySelectorAll("[data-copy-entry]").forEach((button) => {
  button.addEventListener("click", () => copyEntry(button.dataset.copyEntry, button));
});

updateMethodFields();
updateHeroPreview();
