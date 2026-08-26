import YahooFinance from "yahoo-finance2";
import { buildCompanyPayload, normalizeSaudiSymbol } from "../lib/financial-normalizer.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});

function sendJson(response, status, payload) {
  response.status(status).json(payload);
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED", message: "هذه الخدمة تقبل طلبات القراءة فقط." });
    return;
  }

  const rawSymbol = Array.isArray(request.query?.symbol) ? request.query.symbol[0] : request.query?.symbol;
  const symbol = normalizeSaudiSymbol(rawSymbol);
  if (!symbol) {
    sendJson(response, 400, { error: "INVALID_SYMBOL", message: "أدخل رمز تداول مكوّنًا من أربعة أرقام، مثل 2222." });
    return;
  }

  const currentYear = new Date().getUTCFullYear();
  const period1 = `${currentYear - 6}-01-01`;

  try {
    const [quoteSummary, annualSeries] = await Promise.all([
      yahooFinance.quoteSummary(symbol, {
        modules: ["price", "defaultKeyStatistics", "summaryDetail", "financialData"],
      }),
      yahooFinance.fundamentalsTimeSeries(symbol, {
        period1,
        type: "annual",
        module: "all",
        merge: true,
        padTimeSeries: false,
      }),
    ]);

    const payload = buildCompanyPayload(symbol, quoteSummary, annualSeries);
    if (!payload) {
      sendJson(response, 404, {
        error: "NO_ANNUAL_DATA",
        message: "تم العثور على الرمز، لكن لا توجد قائمة مالية سنوية مكتملة يمكن استخدامها.",
      });
      return;
    }

    response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    sendJson(response, 200, payload);
  } catch (error) {
    const details = String(error?.message || error || "");
    const isRateLimited = /429|too many|rate.?limit/i.test(details);
    const isNotFound = /404|not found|no fundamentals|invalid symbol/i.test(details);

    if (isRateLimited) {
      sendJson(response, 503, {
        error: "PROVIDER_RATE_LIMIT",
        message: "Yahoo أوقف الطلب مؤقتًا بسبب كثرة المحاولات. حاول مرة أخرى بعد دقائق.",
      });
      return;
    }

    if (isNotFound) {
      sendJson(response, 404, { error: "SYMBOL_NOT_FOUND", message: "لم يتم العثور على شركة مدرجة بهذا الرمز." });
      return;
    }

    console.error("Yahoo Finance request failed", { symbol, details });
    sendJson(response, 502, {
      error: "DATA_PROVIDER_ERROR",
      message: "تعذر جلب البيانات من Yahoo حاليًا. يمكنك المحاولة لاحقًا أو إدخال الأرقام يدويًا.",
    });
  }
}
