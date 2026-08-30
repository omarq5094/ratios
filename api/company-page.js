import { readFile } from "node:fs/promises";
import { fetchCompanyPayload, toCompanyHttpError } from "../lib/company-service.js";
import { renderCompanyDocument, renderCompanyErrorDocument } from "../lib/company-page-renderer.js";

const indexTemplatePromise = readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  const rawSymbol = Array.isArray(request.query?.symbol) ? request.query.symbol[0] : request.query?.symbol;
  const template = await indexTemplatePromise;

  try {
    const payload = await fetchCompanyPayload(rawSymbol);
    const html = renderCompanyDocument(template, payload);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    response.status(200).send(html);
  } catch (error) {
    const normalized = toCompanyHttpError(error);
    const html = renderCompanyErrorDocument(template, rawSymbol, normalized.payload.message, normalized.status);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.setHeader("Cache-Control", normalized.status >= 500 ? "no-store" : "s-maxage=1800");
    response.status(normalized.status).send(html);
  }
}
