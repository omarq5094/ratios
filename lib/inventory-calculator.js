export const INVENTORY_METHODS = {
  fifo: { label: "FIFO — الوارد أولًا صادر أولًا", explanation: "تُحمّل المبيعات بتكلفة أقدم دفعات الشراء المتاحة، ويبقى في المخزون ما لم يُبع من الدفعات الأحدث." },
  average: { label: "متوسط التكلفة المتحرك", explanation: "بعد كل شراء: متوسط تكلفة الوحدة = (قيمة المخزون قبل الشراء + تكلفة الشراء الجديد) ÷ (الكمية المتبقية قبل الشراء + كمية الشراء الجديد). يُسعّر البيع بالمتوسط القائم وقت البيع، دون إعادة احتساب المتوسط عند البيع." },
  lifo: { label: "LIFO — للمقارنة التعليمية فقط", explanation: "تُحمّل المبيعات بتكلفة أحدث دفعات الشراء المتاحة أولًا، ويبقى ما لم يُبع من الدفعات الأقدم. هذه الطريقة غير مسموح بها في التقارير المعدّة وفق IFRS." },
};
export const LIFO_WARNING = "LIFO للمقارنة التعليمية فقط؛ غير مسموح به في التقارير المعدّة وفق IFRS (IAS 2).";
export const MAX_OPERATIONS = 150;
export class InventoryInputError extends Error {
  constructor(message, index = null, field = null) { super(message); this.name = "InventoryInputError"; this.index = index; this.field = field; }
}

// Exact fractions, reduced after every operation: no rounding of moving averages.
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; };
function rational(n, d = 1n) {
  if (d === 0n) throw new Error("قسمة غير صالحة.");
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d); return { n: n / g, d: d / g };
}
const zero = rational(0n);
const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => rational(a.n * b.n, a.d * b.d);
const div = (a, b) => rational(a.n * b.d, a.d * b.n);
const compare = (a, b) => a.n * b.d - b.n * a.d;
function fixed(value, digits = 2) {
  const scale = 10n ** BigInt(digits), negative = value.n < 0n;
  const numerator = (negative ? -value.n : value.n) * scale;
  const rounded = (numerator * 2n + value.d) / (2n * value.d);
  const text = rounded.toString().padStart(digits + 1, "0");
  return `${negative && rounded ? "-" : ""}${text.slice(0, -digits)}.${text.slice(-digits)}`;
}
export function formatInventoryAmount(value) {
  const [whole, fraction = ""] = String(value).split(".");
  return fixed(rational(BigInt(whole + fraction), 10n ** BigInt(fraction.length)));
}
function decimal(value, index, field, label, digits, allowZero = false) {
  const text = String(value ?? "").trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776)).replace(/٫/g, ".").replace(/٬/g, ",");
  const pattern = new RegExp(`^(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,${digits}})?$`);
  const fail = () => { throw new InventoryInputError(`العملية ${index + 1}: أدخل ${label} صالحًا ${allowZero ? "غير سالب" : "أكبر من صفر"}، حتى ${digits} منازل عشرية وبحد أقصى 1,000,000,000.`, index, field); };
  if (text.length > 40 || !pattern.test(text)) fail();
  const [whole, fraction = ""] = text.replaceAll(",", "").split(".");
  const result = rational(BigInt(whole + fraction), 10n ** BigInt(fraction.length));
  if ((!allowZero && result.n === 0n) || compare(result, rational(1_000_000_000n)) > 0n) fail();
  return result;
}
function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01" || value > "9999-12-31") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function normalizeOperations(operations) {
  if (!Array.isArray(operations) || operations.length > MAX_OPERATIONS) throw new InventoryInputError(`أدخل قائمة بحد أقصى ${MAX_OPERATIONS} عملية.`);
  let previousDate = "";
  return operations.map((op, index) => {
    if (!op || !["purchase", "sale"].includes(op.type)) throw new InventoryInputError(`العملية ${index + 1}: اختر شراء أو بيع.`, index, "type");
    if (!validDate(op.date)) throw new InventoryInputError(`العملية ${index + 1}: أدخل تاريخًا صحيحًا.`, index, "date");
    if (op.date < previousDate) throw new InventoryInputError(`العملية ${index + 1}: التاريخ أقدم من العملية السابقة. أدخل العمليات زمنيًا؛ وداخل اليوم نفسه يُعتمد ترتيب الصفوف.`, index, "date");
    previousDate = op.date;
    const q = decimal(op.quantity, index, "quantity", "كمية", 2);
    const p = op.type === "purchase" ? decimal(op.unitCost, index, "unitCost", "سعر شراء الوحدة", 6, true) : null;
    return { type: op.type, date: op.date, quantity: fixed(q), unitCost: p ? fixed(p, 6) : null, q, p };
  });
}

function calculateMethod(operations, method) {
  let quantity = zero, value = zero, purchases = zero, cogs = zero;
  const layers = [], ledger = [];
  operations.forEach((op, index) => {
    let saleCost = zero, purchaseCost = zero, breakdown = [];
    if (op.type === "purchase") {
      purchaseCost = mul(op.q, op.p); purchases = add(purchases, purchaseCost);
      quantity = add(quantity, op.q); value = add(value, purchaseCost);
      if (method !== "average") layers.push({ quantity: op.q, price: op.p, operation: index + 1, date: op.date });
    } else {
      if (compare(op.q, quantity) > 0n) throw new InventoryInputError(`العملية ${index + 1}: لا يمكن بيع ${op.quantity} وحدة؛ المتاح قبل البيع ${fixed(quantity)} وحدة فقط. عدّل الكمية أو أضف شراءً سابقًا.`, index, "quantity");
      if (method === "average") {
        const average = div(value, quantity);
        saleCost = mul(average, op.q);
        breakdown.push({ quantity: op.quantity, unitCost: fixed(average), unitCostDetail: fixed(average, 6), cost: fixed(saleCost), source: "متوسط الوحدة قبل البيع (مقرب للعرض فقط)" });
      } else {
        let remaining = op.q;
        while (remaining.n > 0n) {
          const at = method === "fifo" ? 0 : layers.length - 1, layer = layers[at];
          const used = compare(remaining, layer.quantity) < 0n ? remaining : layer.quantity;
          const cost = mul(used, layer.price); saleCost = add(saleCost, cost);
          breakdown.push({ quantity: fixed(used), unitCost: fixed(layer.price), unitCostDetail: fixed(layer.price, 6), cost: fixed(cost), source: `شراء العملية ${layer.operation} (${layer.date})` });
          layer.quantity = sub(layer.quantity, used); remaining = sub(remaining, used);
          if (layer.quantity.n === 0n) layers.splice(at, 1);
        }
      }
      quantity = sub(quantity, op.q); value = sub(value, saleCost); cogs = add(cogs, saleCost);
    }
    ledger.push({ operation: index + 1, date: op.date, type: op.type, quantity: op.quantity, unitCost: op.unitCost,
      purchaseCost: fixed(purchaseCost), saleCost: fixed(saleCost), cumulativeCOGS: fixed(cogs),
      remainingQuantity: fixed(quantity), inventoryValue: fixed(value), averageUnitCost: quantity.n ? fixed(div(value, quantity)) : "0.00", breakdown });
  });
  return { method, methodLabel: INVENTORY_METHODS[method].label, remainingQuantity: fixed(quantity), totalPurchaseCost: fixed(purchases),
    costOfGoodsSold: fixed(cogs), endingInventory: fixed(value), averageUnitCost: quantity.n ? fixed(div(value, quantity)) : "0.00", ledger,
    remainingLayers: layers.map(layer => ({ purchaseOperation: layer.operation, date: layer.date, quantity: fixed(layer.quantity), unitCost: fixed(layer.price), value: fixed(mul(layer.quantity, layer.price)) })) };
}

export function calculateInventory(operations, method = "fifo") {
  if (!Object.hasOwn(INVENTORY_METHODS, method)) throw new InventoryInputError("اختر طريقة حساب صحيحة.");
  const normalized = normalizeOperations(operations);
  const results = Object.keys(INVENTORY_METHODS).map(key => calculateMethod(normalized, key));
  return { method, status: normalized.length ? "ready" : "empty",
    operations: normalized.map(({ q, p, ...op }) => op), selected: results.find(result => result.method === method),
    comparison: results.map(({ ledger, remainingLayers, ...summary }) => summary) };
}
