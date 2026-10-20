import { calculateCVP } from "./lib/cvp-calculator.js";
const $ = id => document.getElementById(id);
const form = $("cvpForm");
const fields = ["price", "variableCost", "fixedCosts", "quantity", "targetProfit"];
const fmt = (value, digits = 2) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
const money = value => `${fmt(value, value !== 0 && Math.abs(value) < .01 ? 6 : 2)} ر.س`;
const units = value => `${fmt(value, 0)} وحدة`;
const set = (id, text) => { $(id).textContent = text; };
function clearState(message) {
  $("cvpResults").hidden = true; $("cvpError").hidden = true;
  fields.forEach(id => { $(id).removeAttribute("aria-invalid"); $(id).setAttribute("aria-describedby", id === "quantity" ? "cvpStatus" : "inputHelp"); });
  set("cvpStatus", message);
}
function drawChart(r) {
  // Keep the true intersection visible even when the expected quantity is distant.
  const maxQ = r.breakEvenExact > 0 ? r.breakEvenExact * 1.6 : Math.max(r.input.quantity, 10);
  const maxY = Math.max(r.input.price * maxQ, r.input.fixedCosts + r.input.variableCost * maxQ, 1) * 1.12;
  const mobile = matchMedia("(max-width: 600px)").matches;
  const width = mobile ? 370 : 900, height = mobile ? 330 : 370;
  const left = mobile ? 66 : 96, right = width - 24, top = 30, bottom = height - 62;
  const x = q => left + (q / maxQ) * (right - left);
  const y = amount => bottom - (amount / maxY) * (bottom - top);
  const compact = value => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  const xb = x(r.breakEvenExact), yb = y(r.breakEvenSales);
  const dots = `M${left},${bottom} L${right},${y(r.input.price * maxQ)}`;
  const costs = `M${left},${y(r.input.fixedCosts)} L${right},${y(r.input.fixedCosts + r.input.variableCost * maxQ)}`;
  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const gy = top + i * (bottom-top)/4, amount = maxY * (1-i/4);
    grid += `<line x1="${left}" y1="${gy}" x2="${right}" y2="${gy}" stroke="#ffffff18"/><text x="${left-10}" y="${gy+4}" text-anchor="end">${compact(amount)}</text>`;
  }
  for (let i = 0; i <= 4; i++) {
    grid += `<text x="${left+i*(right-left)/4}" y="${bottom+25}" text-anchor="middle">${compact(maxQ*i/4)}</text>`;
  }
  const qVisible = r.input.quantity <= maxQ;
  $("cvpChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cvpSvgTitle cvpSvgDesc">
    <title id="cvpSvgTitle">الإيرادات والتكاليف ونقطة التعادل</title><desc id="cvpSvgDesc">نقطة التعادل النظرية عند ${fmt(r.breakEvenExact, 6)} وحدة، وقيمة مبيعات ${money(r.breakEvenSales)}. خط الإيرادات متصل، وخط التكاليف متقطع.</desc>
    ${grid}<path d="M${left},${top}V${bottom}H${right}" stroke="#b4c0da" fill="none"/>
    <path d="${dots}" stroke="#65dcd0" stroke-width="3" fill="none"/>
    <path d="${costs}" stroke="#bba5ff" stroke-width="3" stroke-dasharray="9 5" fill="none"/>
    <path d="M${xb},${bottom}V${yb}H${left}" stroke="#ffffff88" stroke-dasharray="4 5" fill="none"/>
    <circle cx="${xb}" cy="${yb}" r="6" fill="#fff" stroke="#65dcd0" stroke-width="3"/>
    <text x="${Math.max(xb, left + 72)}" y="${Math.max(yb-18, top+13)}" text-anchor="middle">نقطة التعادل</text>
    ${qVisible ? `<circle cx="${x(r.input.quantity)}" cy="${y(r.revenue)}" r="4" fill="#65dcd0"><title>الإيراد المتوقع: ${money(r.revenue)}</title></circle>` : ""}
    <image href="/public/assets/saudi-riyal.svg" x="${left}" y="2" width="13" height="15" style="filter:brightness(0) invert(1)" role="img" aria-label="ريال سعودي"/><text x="${(left+right)/2}" y="${height-10}" text-anchor="middle">كمية المبيعات (وحدة)</text>
  </svg>`;
  set("chartDescription", `التقاطع النظري عند ${fmt(r.breakEvenExact, 6)} وحدة ومبيعات ${money(r.breakEvenSales)}. ${qVisible ? "النقطة الصغيرة على خط الإيرادات تمثل المبيعات المتوقعة." : "نطاق الرسم يركز على نقطة التعادل؛ المبيعات المتوقعة تقع خارج هذا النطاق وتظهر قيمتها في النتائج أعلاه."} K = ألف، M = مليون، B = مليار.`);
}
let latest = null;
function render(r) {
  set("contributionValue", money(r.contribution));
  set("ratioValue", `${fmt(r.contributionRatio * 100, 6)}%`);
  set("breakEvenUnitsValue", units(r.breakEvenUnits));
  set("breakEvenSalesValue", money(r.breakEvenSales));
  const loss = r.operatingProfit < 0, profit = r.operatingProfit > 0;
  set("profitStatus", loss ? "خسارة تشغيلية متوقعة" : profit ? "ربح تشغيلي متوقع" : "عند التعادل");
  $("profitStatus").classList.toggle("is-loss", loss);
  $("profitCard").classList.toggle("is-loss", loss); $("profitCard").classList.toggle("is-profit", profit);
  set("profitTitle", loss ? "الخسارة التشغيلية المتوقعة" : "الربح التشغيلي المتوقع");
  set("operatingProfitValue", money(r.operatingProfit));
  set("targetUnitsValue", r.targetUnits === null ? "لم يُحدد هدف" : units(r.targetUnits));
  set("targetFormula", r.targetUnits === null ? "أدخل الربح المستهدف اختياريًا لمعرفة عدد الوحدات." : `لتحقيق ${money(r.input.targetProfit)} على الأقل، مقربًا للأعلى.`);
  const outcome = loss ? `خسارة تشغيلية قدرها ${money(-r.operatingProfit)}` : profit ? `ربح تشغيلي قدره ${money(r.operatingProfit)}` : "تعادلًا: لا ربح ولا خسارة";
  set("resultExplanation", `كل وحدة تساهم بمبلغ ${money(r.contribution)} في تغطية التكاليف الثابتة ثم الربح. تحتاج إلى بيع ${units(r.breakEvenUnits)} على الأقل لتغطية تكاليفك. عند بيع ${units(r.input.quantity)} تتوقع ${outcome} قبل الضريبة.${r.targetUnits === null ? "" : ` ولتحقيق هدف ${money(r.input.targetProfit)}، تحتاج إلى ${units(r.targetUnits)} على الأقل.`}`);
  set("revenueValue", money(r.revenue)); set("variableTotalValue", money(r.totalVariableCosts)); set("fixedTotalValue", money(r.input.fixedCosts)); set("profitTotalValue", money(r.operatingProfit));
  drawChart(r); $("cvpResults").hidden = false;
}
form.addEventListener("submit", event => {
  event.preventDefault(); clearState(""); latest = null;
  try {
    latest = calculateCVP(Object.fromEntries(fields.map(id => [id, $(id).value])));
    render(latest); set("cvpStatus", "اكتمل الحساب. النتائج أسفل النموذج.");
    $("resultsTitle").focus({ preventScroll: true });
    $("cvpResults").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  } catch (error) {
    set("cvpError", error.message); $("cvpError").hidden = false;
    const field = $(error.field); field?.setAttribute("aria-invalid", "true"); field?.setAttribute("aria-describedby", "cvpError"); field?.focus();
  }
});
form.addEventListener("input", () => { latest = null; clearState("تغيّرت المدخلات؛ اضغط الحساب لتحديث النتائج."); });
$("loadExample").addEventListener("click", () => {
  const example = ["70", "42", "84000", "2500", "14000"];
  fields.forEach((id, i) => { $(id).value = example[i]; }); latest = null;
  clearState("تمت تعبئة المثال الدراسي، مع هدف ربح 14,000 ر.س. اضغط الحساب لعرض النتائج.");
});
form.addEventListener("reset", event => {
  event.preventDefault(); fields.forEach(id => { $(id).value = ""; }); latest = null;
  clearState("تم مسح البيانات. أدخل بيانات جديدة أو عبّئ المثال الدراسي."); $("price").focus();
});
window.addEventListener("resize", () => { if (latest) drawChart(latest); });
