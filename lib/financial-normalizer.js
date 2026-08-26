const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export const FINANCIAL_FIELD_KEYS = Object.freeze([
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
  "previousAssets",
  "previousEquity",
  "operatingCashFlow",
  "interestExpense",
]);

function toLatinDigits(value) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(EASTERN_ARABIC_DIGITS.indexOf(digit)));
}

export function normalizeSaudiSymbol(value) {
  const normalized = toLatinDigits(value).trim().toUpperCase().replace(/\s+/g, "");
  if (/^\d{4}$/.test(normalized)) return `${normalized}.SR`;
  if (/^\d{4}\.SR$/.test(normalized)) return normalized;
  return null;
}

function firstFinite(...values) {
  return values.find((value) => typeof value === "number" && Number.isFinite(value)) ?? null;
}

function absoluteFinite(...values) {
  const value = firstFinite(...values);
  return value === null ? null : Math.abs(value);
}

function asIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function completenessScore(statement) {
  return [
    statement.totalRevenue,
    statement.totalAssets,
    statement.currentAssets,
    statement.currentLiabilities,
    statement.stockholdersEquity,
    statement.netIncome,
  ].filter((value) => typeof value === "number" && Number.isFinite(value)).length;
}

export function buildCompanyPayload(symbol, quoteSummary, annualSeries) {
  const statements = (Array.isArray(annualSeries) ? annualSeries : [])
    .filter((statement) => asIsoDate(statement?.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const latest = statements.find((statement) => completenessScore(statement) >= 4);
  if (!latest) return null;

  const latestDate = asIsoDate(latest.date);
  const previous = statements.find((statement) => asIsoDate(statement.date) < latestDate);
  const price = quoteSummary?.price ?? {};

  const fields = {
    revenue: firstFinite(latest.totalRevenue, latest.operatingRevenue),
    costOfSales: firstFinite(latest.costOfRevenue, latest.reconciledCostOfRevenue),
    operatingProfit: firstFinite(latest.operatingIncome, latest.totalOperatingIncomeAsReported, latest.EBIT),
    netProfit: firstFinite(latest.netIncome, latest.netIncomeCommonStockholders),
    currentAssets: firstFinite(latest.currentAssets),
    inventory: firstFinite(latest.inventory),
    currentLiabilities: firstFinite(latest.currentLiabilities),
    totalAssets: firstFinite(latest.totalAssets),
    totalDebt: firstFinite(latest.totalDebt),
    equity: firstFinite(latest.stockholdersEquity, latest.commonStockEquity),
    previousAssets: firstFinite(previous?.totalAssets),
    previousEquity: firstFinite(previous?.stockholdersEquity, previous?.commonStockEquity),
    operatingCashFlow: firstFinite(latest.operatingCashFlow),
    interestExpense: absoluteFinite(latest.interestExpenseNonOperating, latest.interestExpense),
  };

  const missingFields = FINANCIAL_FIELD_KEYS.filter((key) => fields[key] === null);

  return {
    symbol,
    companyName: price.longName || price.shortName || symbol,
    shortName: price.shortName || "",
    currency: price.currency || "SAR",
    currencySymbol: price.currencySymbol || "",
    period: latestDate.slice(0, 4),
    periodEnd: latestDate,
    fields,
    availableFieldCount: FINANCIAL_FIELD_KEYS.length - missingFields.length,
    totalFieldCount: FINANCIAL_FIELD_KEYS.length,
    missingFields,
    source: {
      provider: "Yahoo Finance",
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials/`,
      fetchedAt: new Date().toISOString(),
    },
  };
}
