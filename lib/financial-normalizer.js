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
  "marketCap",
  "freeCashFlow",
  "enterpriseValue",
  "ebitda",
  "cashAndEquivalents",
  "previousInventory",
  "annualDividendPerShare",
  "sharePrice",
  "totalDividends",
  "earningsGrowthPercent",
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

function asPercentPoints(value) {
  return typeof value === "number" && Number.isFinite(value) ? value * 100 : null;
}

function asIsoDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function conciseDescription(value, limit = 700) {
  const normalized = cleanText(value);
  if (!normalized || normalized.length <= limit) return normalized;

  const excerpt = normalized.slice(0, limit + 1);
  const sentenceEnd = Math.max(
    excerpt.lastIndexOf("."),
    excerpt.lastIndexOf("!"),
    excerpt.lastIndexOf("?"),
    excerpt.lastIndexOf("؛"),
  );
  if (sentenceEnd >= Math.floor(limit * 0.45)) return excerpt.slice(0, sentenceEnd + 1);
  return `${normalized.slice(0, limit).trim()}…`;
}

function safeWebsite(value) {
  const normalized = cleanText(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function roundDecimal(value, precision = 8) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function buildDividendHistory(events, referenceDate = new Date()) {
  if (!Array.isArray(events)) {
    return {
      status: "unavailable",
      years: [],
      regularity: "غير متوفر",
      yearsWithDividends: 0,
      evaluatedYears: 0,
      includesPartialCurrentYear: false,
    };
  }

  const currentYear = referenceDate.getUTCFullYear();
  const firstYear = currentYear - 4;
  const totalsByYear = new Map();

  for (const event of events) {
    const date = asIsoDate(event?.date);
    const amount = firstFinite(event?.dividends);
    if (!date || amount === null || amount <= 0) continue;

    const year = Number(date.slice(0, 4));
    if (year < firstYear || year > currentYear) continue;
    const summary = totalsByYear.get(year) || { totalPerShare: 0, paymentCount: 0 };
    summary.totalPerShare += amount;
    summary.paymentCount += 1;
    totalsByYear.set(year, summary);
  }

  const chronologicalYears = [];
  for (let year = firstYear; year <= currentYear; year += 1) {
    const summary = totalsByYear.get(year) || { totalPerShare: 0, paymentCount: 0 };
    const previous = chronologicalYears.at(-1);
    const totalPerShare = roundDecimal(summary.totalPerShare);
    const annualChangeAmount = previous ? roundDecimal(totalPerShare - previous.totalPerShare) : null;
    const annualChangePercent = previous?.totalPerShare > 0
      ? roundDecimal((annualChangeAmount / previous.totalPerShare) * 100)
      : null;

    chronologicalYears.push({
      year,
      totalPerShare,
      paymentCount: summary.paymentCount,
      annualChangeAmount,
      annualChangePercent,
      isPartial: year === currentYear,
    });
  }

  const completedYears = chronologicalYears.filter((item) => !item.isPartial);
  const yearsWithDividends = completedYears.filter((item) => item.totalPerShare > 0).length;
  const regularity = yearsWithDividends === completedYears.length
    ? "منتظمة سنويًا"
    : yearsWithDividends > 0
      ? "متقطعة"
      : "لا توجد توزيعات مسجلة";

  return {
    status: "available",
    years: chronologicalYears.reverse(),
    regularity,
    yearsWithDividends,
    evaluatedYears: completedYears.length,
    includesPartialCurrentYear: true,
  };
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

export function buildCompanyPayload(symbol, quoteSummary, annualSeries, dividendEvents = []) {
  const statements = (Array.isArray(annualSeries) ? annualSeries : [])
    .filter((statement) => asIsoDate(statement?.date))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const latest = statements.find((statement) => completenessScore(statement) >= 4);
  if (!latest) return null;

  const latestDate = asIsoDate(latest.date);
  const previous = statements.find((statement) => asIsoDate(statement.date) < latestDate);
  const price = quoteSummary?.price ?? {};
  const keyStatistics = quoteSummary?.defaultKeyStatistics ?? {};
  const summaryDetail = quoteSummary?.summaryDetail ?? {};
  const financialData = quoteSummary?.financialData ?? {};
  const assetProfile = quoteSummary?.assetProfile ?? {};
  const sharePrice = firstFinite(price.regularMarketPrice, summaryDetail.regularMarketPrice);
  const sharesOutstanding = firstFinite(keyStatistics.sharesOutstanding, keyStatistics.impliedSharesOutstanding);
  const directMarketCap = firstFinite(price.marketCap, summaryDetail.marketCap);
  const marketCap = directMarketCap ?? (
    sharePrice !== null && sharesOutstanding !== null ? sharePrice * sharesOutstanding : null
  );

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
    marketCap,
    freeCashFlow: firstFinite(latest.freeCashFlow),
    enterpriseValue: firstFinite(keyStatistics.enterpriseValue),
    ebitda: firstFinite(latest.EBITDA, latest.normalizedEBITDA),
    cashAndEquivalents: firstFinite(
      latest.cashCashEquivalentsAndShortTermInvestments,
      latest.cashAndCashEquivalents,
      latest.cashFinancial,
    ),
    previousInventory: firstFinite(previous?.inventory),
    annualDividendPerShare: firstFinite(summaryDetail.dividendRate),
    sharePrice,
    totalDividends: absoluteFinite(latest.cashDividendsPaid, latest.commonStockDividendPaid),
    earningsGrowthPercent: asPercentPoints(
      firstFinite(financialData.earningsGrowth, keyStatistics.earningsQuarterlyGrowth),
    ),
  };

  const missingFields = FINANCIAL_FIELD_KEYS.filter((key) => fields[key] === null);
  const companyInfo = {
    sector: cleanText(assetProfile.sectorDisp) || cleanText(assetProfile.sector),
    industry: cleanText(assetProfile.industryDisp) || cleanText(assetProfile.industry),
    website: safeWebsite(assetProfile.website),
    description: conciseDescription(assetProfile.longBusinessSummary || assetProfile.description),
  };

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
    companyInfo,
    dividendHistory: buildDividendHistory(dividendEvents),
    source: {
      provider: "Yahoo Finance",
      url: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials/`,
      fetchedAt: new Date().toISOString(),
    },
  };
}
