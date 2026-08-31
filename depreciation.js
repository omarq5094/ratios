import { calculateDepreciation } from "./lib/depreciation-calculator.js";

const METHOD_LABELS = {
  straight_line: "القسط الثابت",
  double_declining: "الرصيد المتناقص المضاعف",
  units_of_production: "وحدات الإنتاج",
};
const CHART_METRICS = Object.freeze({
  openingBookValue: { label: "القيمة أول الفترة", title: "القيمة أول الفترة عبر الفترات" },
  depreciation: { label: "مصروف الإهلاك", title: "مصروف الإهلاك عبر الفترات" },
  accumulatedDepreciation: { label: "مجمع الإهلاك", title: "مجمع الإهلاك عبر الفترات" },
  closingBookValue: { label: "القيمة آخر الفترة", title: "القيمة آخر الفترة عبر الفترات" },
});
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
const chart = document.querySelector("#depreciationChart");
const chartNote = document.querySelector("#depreciationChartNote");
const chartMetricButtons = [...document.querySelectorAll("[data-chart-metric]")];
const shareChartButton = document.querySelector("#shareDepreciationChart");
const downloadChartButton = document.querySelector("#downloadDepreciationChart");
const shareFeedback = document.querySelector("#depreciationShareFeedback");
const periodSelect = document.querySelector("#journalPeriod");
const journalPurchase = document.querySelector("#purchaseJournalEntry");
const journalDepreciation = document.querySelector("#depreciationJournalEntry");
let latestCalculation = null;
let activeChartMetric = "closingBookValue";

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

function sampledSchedule(schedule, maximumBars = 12) {
  if (schedule.length <= maximumBars) return schedule;
  const indexes = new Set();
  for (let index = 0; index < maximumBars; index += 1) {
    indexes.add(Math.round((index * (schedule.length - 1)) / (maximumBars - 1)));
  }
  return [...indexes].map((index) => schedule[index]);
}

function setChartMetric(metric) {
  if (!Object.hasOwn(CHART_METRICS, metric)) return;
  activeChartMetric = metric;
  showShareFeedback();
  chartMetricButtons.forEach((button) => {
    const active = button.dataset.chartMetric === metric;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (latestCalculation) renderDepreciationChart(latestCalculation.schedule);
}

function renderDepreciationChart(schedule) {
  chart.replaceChildren();
  const metric = CHART_METRICS[activeChartMetric];
  const displayedRows = sampledSchedule(schedule);
  const maximumValue = Math.max(...displayedRows.map((row) => row[activeChartMetric]), 1);
  chart.classList.toggle("is-single-period", displayedRows.length === 1);
  setText("depreciationChartTitle", metric.title);
  setText("depreciationChartLegend", metric.label);
  chart.setAttribute("aria-label", `رسم بياني لـ${metric.label} عبر فترات الإهلاك`);

  displayedRows.forEach((row) => {
    const item = document.createElement("article");
    item.className = "depreciation-chart-item";
    const value = document.createElement("span");
    const metricValue = row[activeChartMetric];
    value.textContent = formatMoney(metricValue);
    const track = document.createElement("div");
    const bar = document.createElement("i");
    const height = Math.max(6, (metricValue / maximumValue) * 100);
    bar.style.setProperty("--bar-height", `${height}%`);
    bar.title = `${row.label}: ${formatMoney(metricValue)} ريال`;
    track.append(bar);
    const label = document.createElement("small");
    label.textContent = row.label;
    item.append(value, track, label);
    chart.append(item);
  });

  const sampled = displayedRows.length < schedule.length;
  chartNote.hidden = !sampled;
  chartNote.textContent = sampled
    ? `عُرضت ${displayedRows.length} فترات موزعة من أصل ${schedule.length} للمحافظة على وضوح الرسم.`
    : "";
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

function buildChartCanvas() {
  if (!latestCalculation) throw new Error("احسب الإهلاك أولًا قبل مشاركة الرسم.");
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 800;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("المتصفح لا يدعم إنشاء صورة الرسم.");

  const background = context.createLinearGradient(0, 0, 1200, 800);
  background.addColorStop(0, "#183a49");
  background.addColorStop(0.48, "#222b53");
  background.addColorStop(1, "#3b3578");
  context.fillStyle = background;
  context.fillRect(0, 0, 1200, 800);

  context.strokeStyle = "rgba(255,255,255,.09)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(80, 40, 190, 0, Math.PI * 2);
  context.stroke();

  const metric = CHART_METRICS[activeChartMetric];
  const asset = currentAssetDetails();
  const rows = sampledSchedule(latestCalculation.schedule, 8);
  const maximumValue = Math.max(...rows.map((row) => row[activeChartMetric]), 1);

  context.direction = "rtl";
  context.textAlign = "right";
  context.fillStyle = "rgba(255,255,255,.56)";
  context.font = '600 20px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("منصة الأدوات المحاسبية", 1120, 62);
  context.fillStyle = "#ffffff";
  context.font = '800 43px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(metric.title, 1120, 125);
  context.fillStyle = "rgba(255,255,255,.62)";
  context.font = '600 20px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText(`${asset.assetName} · ${METHOD_LABELS[latestCalculation.input.method]}`, 1120, 165);

  const chartLeft = 85;
  const chartRight = 1115;
  const chartTop = 245;
  const chartBottom = 650;
  const gap = 26;
  const barWidth = Math.min(105, (chartRight - chartLeft - gap * (rows.length - 1)) / rows.length);
  const totalWidth = barWidth * rows.length + gap * (rows.length - 1);
  const startX = chartRight - ((chartRight - chartLeft - totalWidth) / 2) - barWidth;

  context.strokeStyle = "rgba(255,255,255,.14)";
  context.beginPath();
  context.moveTo(chartLeft, chartBottom);
  context.lineTo(chartRight, chartBottom);
  context.stroke();

  rows.forEach((row, index) => {
    const metricValue = row[activeChartMetric];
    const barHeight = Math.max(10, (metricValue / maximumValue) * (chartBottom - chartTop));
    const x = startX - index * (barWidth + gap);
    const y = chartBottom - barHeight;
    const gradient = context.createLinearGradient(0, y, 0, chartBottom);
    gradient.addColorStop(0, "#8f76f3");
    gradient.addColorStop(1, "#50d5ca");
    roundedRectPath(context, x, y, barWidth, barHeight, 13);
    context.fillStyle = gradient;
    context.fill();

    context.textAlign = "center";
    context.fillStyle = "rgba(255,255,255,.78)";
    context.font = '700 17px "Segoe UI", Tahoma, Arial, sans-serif';
    context.fillText(formatMoney(metricValue), x + barWidth / 2, Math.max(chartTop - 15, y - 15));
    context.fillStyle = "rgba(255,255,255,.58)";
    context.font = '600 16px "Segoe UI", Tahoma, Arial, sans-serif';
    context.fillText(row.label, x + barWidth / 2, 687);
  });

  context.textAlign = "right";
  context.fillStyle = "rgba(255,255,255,.46)";
  context.font = '600 16px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("القيم بالريال السعودي · النتائج تعليمية ومحاسبية", 1120, 755);
  context.direction = "ltr";
  context.textAlign = "left";
  context.fillStyle = "#ffffff";
  context.font = '700 16px "Segoe UI", Tahoma, Arial, sans-serif';
  context.fillText("ratios-ashy.vercel.app/services/depreciation", 80, 755);
  return canvas;
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("تعذر إنشاء صورة الرسم.")), "image/png", 1);
  });
}

function chartFileName() {
  const metric = activeChartMetric.replace(/([A-Z])/g, "-$1").toLowerCase();
  return `depreciation-${metric}.png`;
}

async function createChartImage() {
  return canvasBlob(buildChartCanvas());
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showShareFeedback(message = "", type = "") {
  shareFeedback.textContent = message;
  shareFeedback.dataset.type = type;
}

async function downloadChartImage() {
  try {
    showShareFeedback("جارٍ إنشاء الصورة...");
    const blob = await createChartImage();
    downloadBlob(blob, chartFileName());
    showShareFeedback("تم تنزيل صورة الرسم.", "success");
  } catch (error) {
    showShareFeedback(error instanceof Error ? error.message : "تعذر تنزيل الرسم.", "error");
  }
}

async function shareChartImage() {
  try {
    showShareFeedback("جارٍ تجهيز الرسم للمشاركة...");
    const blob = await createChartImage();
    if (typeof File !== "function") {
      downloadBlob(blob, chartFileName());
      showShareFeedback("جهازك لا يدعم مشاركة الملفات مباشرة؛ تم تنزيل الصورة بدلًا من ذلك.", "success");
      return;
    }
    const file = new File([blob], chartFileName(), { type: "image/png" });
    const shareData = { files: [file], title: CHART_METRICS[activeChartMetric].title, text: "رسم إهلاك من منصة الأدوات المحاسبية" };
    let canShareFiles = false;
    if (typeof navigator.share === "function") {
      try {
        canShareFiles = typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] });
      } catch {
        canShareFiles = false;
      }
    }
    if (canShareFiles) {
      await navigator.share(shareData);
      showShareFeedback("تم فتح خيارات المشاركة.", "success");
      return;
    }
    downloadBlob(blob, chartFileName());
    showShareFeedback("جهازك لا يدعم مشاركة الملفات مباشرة؛ تم تنزيل الصورة بدلًا من ذلك.", "success");
  } catch (error) {
    if (error?.name === "AbortError") {
      showShareFeedback();
      return;
    }
    showShareFeedback(error instanceof Error ? error.message : "تعذرت مشاركة الرسم.", "error");
  }
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
  renderDepreciationChart(calculation.schedule);
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
    setChartMetric("closingBookValue");
    resultsSection.hidden = true;
    showError();
    updateMethodFields();
    updateHeroPreview();
    publishAssistantContext();
  });
});
methodInputs.forEach((input) => input.addEventListener("change", updateMethodFields));
chartMetricButtons.forEach((button) => button.addEventListener("click", () => setChartMetric(button.dataset.chartMetric)));
shareChartButton.addEventListener("click", shareChartImage);
downloadChartButton.addEventListener("click", downloadChartImage);
document.querySelector("#assetCost").addEventListener("input", updateHeroPreview);
document.querySelector("#residualValue").addEventListener("input", updateHeroPreview);
periodSelect.addEventListener("change", () => renderJournal(Number(periodSelect.value)));
document.querySelectorAll("[data-copy-entry]").forEach((button) => {
  button.addEventListener("click", () => copyEntry(button.dataset.copyEntry, button));
});

updateMethodFields();
updateHeroPreview();
