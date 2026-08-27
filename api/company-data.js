import { fetchCompanyPayload, toCompanyHttpError } from "../lib/company-service.js";

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

  try {
    const payload = await fetchCompanyPayload(rawSymbol);
    response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    sendJson(response, 200, payload);
  } catch (error) {
    const normalized = toCompanyHttpError(error);
    if (normalized.status >= 500) {
      console.error("Yahoo Finance request failed", {
        symbol: rawSymbol,
        details: String(error?.cause?.message || error?.message || error || ""),
      });
    }
    sendJson(response, normalized.status, normalized.payload);
  }
}
