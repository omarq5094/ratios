import { calculateInventory, formatInventoryAmount, INVENTORY_METHODS, LIFO_WARNING, MAX_OPERATIONS } from "./lib/inventory-calculator.js";
import { buildInventoryContext } from "./lib/inventory-context.js";

const $ = id => document.getElementById(id);
const form = $("inventoryForm"), methodInput = $("inventoryMethod");
let operations = [], editingIndex = null, draftDirty = false;
const grouped = text => String(text).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
function number(value) { const [whole, fraction] = String(value).split("."); return `${grouped(whole)}${fraction === undefined ? "" : `.${fraction}`}`; }
const money = value => `${number(value)} ر.س`;
const units = value => `${number(value)} وحدة`;
const set = (id, text) => { $(id).textContent = text; };
function element(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function cell(row, text, numeric = false) { const node = element("td", text, numeric ? "inventory-number" : ""); row.append(node); return node; }
function publish(calculation) {
  const context = calculation ? buildInventoryContext(calculation) : null;
  window.accountingAnalysisContext = context;
  window.dispatchEvent(new CustomEvent("accounting-analysis-context", { detail: context }));
}
function clearError() {
  $("inventoryError").hidden = true;
  form.querySelectorAll("[aria-invalid]").forEach(node => { node.removeAttribute("aria-invalid"); node.removeAttribute("aria-describedby"); });
}
function showError(error) {
  set("inventoryError", error.message); $("inventoryError").hidden = false;
  const ids = { type: "operationType", date: "operationDate", quantity: "operationQuantity", unitCost: "operationCost" };
  const input = $(ids[error.field]);
  if (input) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "inventoryError"); }
}
function syncType() {
  const isSale = $("operationType").value === "sale";
  $("operationCost").disabled = isSale; $("operationCost").required = !isSale;
}
function resetEditor() {
  editingIndex = null; draftDirty = false; form.reset();
  $("operationDate").value = operations.at(-1)?.date || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  set("entryTitle", "إضافة عملية"); set("saveOperation", "إضافة العملية"); $("cancelEdit").hidden = true;
  syncType(); clearError();
}
function editOperation(index) {
  editingIndex = index; draftDirty = false;
  const op = operations[index];
  $("operationType").value = op.type; $("operationDate").value = op.date;
  $("operationQuantity").value = op.quantity; $("operationCost").value = op.unitCost ?? "";
  set("entryTitle", `تعديل العملية ${index + 1}`); set("saveOperation", "حفظ التعديل"); $("cancelEdit").hidden = false;
  syncType(); clearError(); render(); $("operationQuantity").focus();
}
function renderOperations() {
  const body = $("operationsBody"); body.replaceChildren();
  set("operationsCount", `${operations.length} / ${MAX_OPERATIONS} عملية`);
  if (!operations.length) { const row = element("tr"), empty = cell(row, "لا توجد عمليات بعد. أضف شراءً لبدء الحساب."); empty.colSpan = 6; body.append(row); }
  operations.forEach((op, index) => {
    const row = element("tr"); cell(row, String(index + 1)); cell(row, op.date);
    cell(row, op.type === "purchase" ? "شراء" : "بيع"); cell(row, number(op.quantity), true);
    cell(row, op.unitCost === null ? "—" : money(formatInventoryAmount(op.unitCost)), true);
    const actions = cell(row, ""), edit = element("button", "تعديل"), remove = element("button", "حذف", "inventory-delete");
    edit.type = remove.type = "button";
    edit.setAttribute("aria-label", `تعديل العملية ${index + 1}`); remove.setAttribute("aria-label", `حذف العملية ${index + 1}`);
    edit.addEventListener("click", () => editOperation(index));
    remove.addEventListener("click", () => { operations.splice(index, 1); resetEditor(); render(); });
    actions.append(edit, remove); body.append(row);
  });
}
function renderComparison(calculation) {
  const body = $("comparisonBody"); body.replaceChildren();
  calculation.comparison.forEach(result => {
    const row = element("tr"); if (result.method === calculation.method) row.className = "inventory-selected";
    const label = element("th", result.methodLabel); label.scope = "row"; row.append(label);
    cell(row, money(result.costOfGoodsSold), true); cell(row, money(result.endingInventory), true); cell(row, units(result.remainingQuantity), true); body.append(row);
  });
}
function renderLedger(result) {
  const body = $("ledgerBody"); body.replaceChildren();
  result.ledger.forEach(op => {
    const row = element("tr"); cell(row, `${op.operation}. ${op.type === "purchase" ? "شراء" : "بيع"} ${number(op.quantity)} — ${op.date}`);
    cell(row, money(op.purchaseCost), true); cell(row, money(op.saleCost), true);
    cell(row, units(op.remainingQuantity), true); cell(row, money(op.inventoryValue), true); cell(row, money(op.averageUnitCost), true);
    const detailsCell = cell(row, "");
    if (op.type === "sale") {
      const details = element("details"), summary = element("summary", "عرض طريقة احتساب البيع"), list = element("ul");
      op.breakdown.forEach(part => list.append(element("li", `${part.source}: ${number(part.quantity)} × ${money(part.unitCost)} = ${money(part.cost)}`)));
      details.append(summary, list); detailsCell.append(details);
    } else detailsCell.textContent = "تضاف الكمية وتكلفتها إلى المخزون";
    body.append(row);
  });
}
function renderChart(calculation) {
  const chart = $("inventoryChart"); chart.replaceChildren();
  const maximum = Math.max(...calculation.comparison.flatMap(r => [Number(r.costOfGoodsSold), Number(r.endingInventory)]), 1);
  let defaultBar;
  function inspect(button, result, key, label) {
    chart.querySelectorAll("button").forEach(node => node.setAttribute("aria-pressed", String(node === button)));
    set("inventoryChartDetail", `${result.methodLabel} — ${label}: ${money(result[key])}. الكمية المتبقية: ${units(result.remainingQuantity)}. إجمالي تكلفة المشتريات: ${money(result.totalPurchaseCost)}.${result.method === "lifo" ? ` ${LIFO_WARNING}` : ""}`);
  }
  calculation.comparison.forEach(result => {
    const group = element("div", undefined, `inventory-chart-group${result.method === calculation.method ? " is-selected" : ""}`);
    const bars = element("div", undefined, "inventory-chart-bars");
    for (const [key, label, className] of [["costOfGoodsSold", "تكلفة المبيعات", ""], ["endingInventory", "المخزون المتبقي", "inventory-stock"]]) {
      const button = element("button", undefined, `inventory-chart-bar ${className}`); button.type = "button";
      button.setAttribute("aria-label", `${result.methodLabel}، ${label}: ${money(result[key])}`); button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-describedby", "inventoryChartDetail");
      const column = element("span", undefined, "inventory-column"); column.style.height = `${Number(result[key]) / maximum * 78}%`; column.setAttribute("aria-hidden", "true");
      button.append(column, element("span", label, "inventory-bar-label"));
      const show = () => inspect(button, result, key, label);
      button.addEventListener("pointerenter", show); button.addEventListener("focus", show); button.addEventListener("click", show);
      bars.append(button); if (result.method === calculation.method && key === "costOfGoodsSold") defaultBar = show;
    }
    group.append(bars, element("h4", result.method === "average" ? "المتوسط المتحرك" : result.method === "lifo" ? "LIFO · تعليم فقط" : "FIFO")); chart.append(group);
  });
  defaultBar?.();
}
function render() {
  clearError(); renderOperations();
  const method = methodInput.value;
  set("methodExplanation", INVENTORY_METHODS[method]?.explanation || "اختر طريقة حساب.");
  $("lifoWarning").hidden = method !== "lifo";
  try {
    const calculation = calculateInventory(operations, method), result = calculation.selected;
    $("inventoryResults").hidden = calculation.status !== "ready";
    if (calculation.status === "ready") {
      set("selectedMethodLabel", result.methodLabel); set("remainingQuantity", units(result.remainingQuantity));
      set("totalCOGS", money(result.costOfGoodsSold)); set("endingInventory", money(result.endingInventory));
      set("inventoryExplanation", `من إجمالي مشتريات بتكلفة ${money(result.totalPurchaseCost)}، حُمّل على المبيعات ${money(result.costOfGoodsSold)}، وبقي مخزون ${units(result.remainingQuantity)} بتكلفة ${money(result.endingInventory)}. ${INVENTORY_METHODS[method].explanation}`);
      renderComparison(calculation); renderLedger(result); renderChart(calculation);
    }
    publish(draftDirty ? null : calculation);
    set("inventoryStatus", draftDirty ? "المسودة لم تُحفظ بعد. النتائج تخص عمليات السجل المحفوظة؛ احفظ العملية أو ألغِ تعديلها لإرفاق البيانات للمحلل." : calculation.status === "ready" ? "تحدثت النتائج والرسم والمحلل وفق عمليات السجل الحالية." : "لا توجد عمليات بعد. لا يمكن تحليل تكلفة المخزون قبل إدخال عمليات.");
  } catch (error) {
    $("inventoryResults").hidden = true; publish(null); showError(error);
    set("inventoryStatus", "توقف الحساب لوجود خطأ في التسلسل. صحح العملية أو احذفها؛ لا تُرسل نتائج قديمة للمحلل.");
  }
}
form.addEventListener("submit", event => {
  event.preventDefault(); clearError();
  const op = { type: $("operationType").value, date: $("operationDate").value, quantity: $("operationQuantity").value, unitCost: $("operationType").value === "purchase" ? $("operationCost").value : null };
  const candidate = operations.slice(); if (editingIndex === null) candidate.push(op); else candidate[editingIndex] = op;
  try {
    const calculation = calculateInventory(candidate, methodInput.value);
    operations = calculation.operations; resetEditor(); render(); $("operationQuantity").focus();
  } catch (error) { publish(null); showError(error); set("inventoryStatus", "لم تُحفظ العملية. صحح البيانات ثم حاول مجددًا."); }
});
form.addEventListener("input", () => {
  draftDirty = true; publish(null); clearError();
  $("cancelEdit").hidden = false; set("cancelEdit", editingIndex === null ? "إلغاء الإدخال" : "إلغاء التعديل");
  set("inventoryStatus", "أضف العملية أو احفظ تعديلها لتحديث النتائج والمحلل. النتائج المعروضة تخص عمليات السجل المحفوظة.");
});
$("operationType").addEventListener("change", syncType);
$("cancelEdit").addEventListener("click", () => { resetEditor(); render(); });
methodInput.addEventListener("change", render);
resetEditor(); render();
