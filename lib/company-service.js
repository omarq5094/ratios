import YahooFinance from "yahoo-finance2";
import { buildCompanyPayload, normalizeSaudiSymbol } from "./financial-normalizer.js";
import { arabicCompanyName } from "./company-names-ar.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});

export class CompanyDataError extends Error {
  constructor(status, code, message, cause = null) {
    super(message, cause ? { cause } : undefined);
    this.name = "CompanyDataError";
    this.status = status;
    this.code = code;
  }
}

function classifyProviderError(error) {
  if (error instanceof CompanyDataError) return error;

  const details = String(error?.message || error || "");
  if (/429|too many|rate.?limit/i.test(details)) {
    return new CompanyDataError(
      503,
      "PROVIDER_RATE_LIMIT",
      "Yahoo أوقف الطلب مؤقتًا بسبب كثرة المحاولات. حاول مرة أخرى بعد دقائق.",
      error,
    );
  }

  if (/404|not found|no fundamentals|invalid symbol/i.test(details)) {
    return new CompanyDataError(404, "SYMBOL_NOT_FOUND", "لم يتم العثور على شركة مدرجة بهذا الرمز.", error);
  }

  return new CompanyDataError(
    502,
    "DATA_PROVIDER_ERROR",
    "تعذر جلب البيانات من Yahoo حاليًا. يمكنك المحاولة لاحقًا أو إدخال الأرقام يدويًا.",
    error,
  );
}

export async function fetchCompanyPayload(rawSymbol) {
  const symbol = normalizeSaudiSymbol(rawSymbol);
  if (!symbol) {
    throw new CompanyDataError(400, "INVALID_SYMBOL", "أدخل رمز تداول مكوّنًا من أربعة أرقام، مثل 2222.");
  }

  const currentYear = new Date().getUTCFullYear();
  const period1 = `${currentYear - 6}-01-01`;
  const dividendPeriod1 = `${currentYear - 4}-01-01`;

  try {
    const [quoteSummary, annualSeries, dividendEvents] = await Promise.all([
      yahooFinance.quoteSummary(symbol, {
        modules: ["price", "assetProfile", "defaultKeyStatistics", "summaryDetail", "financialData"],
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1,
        type: "annual",
        module: "all",
        merge: true,
        padTimeSeries: false,
      }),
      yahooFinance.chart(symbol, {
        period1: dividendPeriod1,
        period2: new Date(),
        interval: "1mo",
        events: "div",
        return: "array",
      }).then((chartData) => (
        chartData.events?.dividends?.map((event) => ({
          date: event.date,
          dividends: event.amount,
        })) || []
      )).catch((error) => {
        console.warn("Yahoo Finance dividend history unavailable", {
          symbol,
          details: String(error?.message || error || ""),
        });
        return null;
      }),
    ]);

    const payload = buildCompanyPayload(symbol, quoteSummary, annualSeries, dividendEvents);
    if (!payload) {
      throw new CompanyDataError(
        404,
        "NO_ANNUAL_DATA",
        "تم العثور على الرمز، لكن لا توجد قائمة مالية سنوية مكتملة يمكن استخدامها.",
      );
    }

    const localizedName = arabicCompanyName(symbol);
    return localizedName ? { ...payload, companyName: localizedName } : payload;
  } catch (error) {
    throw classifyProviderError(error);
  }
}

export function toCompanyHttpError(error) {
  const normalized = classifyProviderError(error);
  return {
    status: normalized.status,
    payload: {
      error: normalized.code,
      message: normalized.message,
    },
  };
}
