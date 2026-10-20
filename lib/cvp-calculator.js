// Decimal arithmetic keeps whole-unit thresholds exact (including 0.3 - 0.2).
const SCALE = 1_000_000n;
const MAX_INPUT = 1_000_000_000_000n * SCALE;
export class CVPInputError extends Error {
  constructor(field, message) { super(message); this.name = "CVPInputError"; this.field = field; }
}
function decimal(value, field, label, optional = false) {
  let text = String(value ?? "").trim().replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776)).replace(/٫/g, ".").replace(/٬/g, ",");
  if (!text && optional) return null;
  const fail = message => { throw new CVPInputError(field, message); };
  if (!text) fail(`أدخل ${label}.`);
  if (text.length > 40 || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,6})?$/.test(text)) {
    fail(`أدخل ${label} كرقم صالح غير سالب، بحد أقصى 6 منازل عشرية. مثال: 84,000 أو 42.5.`);
  }
  text = text.replaceAll(",", "");
  const [whole, fraction = ""] = text.split(".");
  const scaled = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0"));
  if (scaled > MAX_INPUT) fail(`قيمة ${label} كبيرة جدًا؛ الحد لكل مدخل هو 1,000,000,000,000.`);
  return scaled;
}
const toNumber = scaled => Number(scaled) / Number(SCALE);
const ceilDivide = (a, b) => Number((a + b - 1n) / b);
export function calculateCVP(input) {
  const p = decimal(input.price, "price", "سعر بيع الوحدة");
  const v = decimal(input.variableCost, "variableCost", "التكلفة المتغيرة للوحدة");
  const f = decimal(input.fixedCosts, "fixedCosts", "إجمالي التكاليف الثابتة");
  const q = decimal(input.quantity, "quantity", "كمية المبيعات المتوقعة");
  const target = decimal(input.targetProfit, "targetProfit", "الربح التشغيلي المستهدف", true);
  if (p <= 0n) throw new CVPInputError("price", "يجب أن يكون سعر بيع الوحدة أكبر من صفر.");
  if (v >= p) throw new CVPInputError("variableCost", "يجب أن تكون التكلفة المتغيرة للوحدة أقل من سعر البيع؛ عند تساويهما أو تجاوزهما لا توجد نقطة تعادل قابلة للتحقيق مع تكاليف ثابتة موجبة.");
  if (q % SCALE !== 0n) throw new CVPInputError("quantity", "أدخل كمية المبيعات بعدد وحدات صحيح غير سالب.");
  const cm = p - v;
  const result = {
    input: { price: toNumber(p), variableCost: toNumber(v), fixedCosts: toNumber(f), quantity: toNumber(q), targetProfit: target === null ? null : toNumber(target) },
    contribution: toNumber(cm), contributionRatio: Number(cm) / Number(p),
    breakEvenExact: Number(f) / Number(cm), breakEvenUnits: ceilDivide(f, cm),
    breakEvenSales: toNumber(f) * (Number(p) / Number(cm)),
    revenue: Number(p * q) / Number(SCALE * SCALE),
    totalVariableCosts: Number(v * q) / Number(SCALE * SCALE),
    totalCosts: Number(f * SCALE + v * q) / Number(SCALE * SCALE),
    operatingProfit: Number(cm * q - f * SCALE) / Number(SCALE * SCALE),
    targetUnits: target === null ? null : ceilDivide(f + target, cm),
  };
  if (Object.values(result).some(value => typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER))) {
    throw new CVPInputError("fixedCosts", "النتائج تتجاوز النطاق العددي الآمن. خفّض القيم أو استخدم وحدة قياس أكبر قبل الحساب.");
  }
  return result;
}
