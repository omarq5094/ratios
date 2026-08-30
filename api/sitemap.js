import { MAIN_MARKET_COMPANY_SYMBOLS } from "../lib/company-symbols.js";
import { SITE_URL } from "../lib/company-page-renderer.js";

function urlEntry(path, priority, changeFrequency) {
  return [
    "  <url>",
    `    <loc>${SITE_URL}${path}</loc>`,
    `    <changefreq>${changeFrequency}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

export function buildSitemap() {
  const entries = [
    urlEntry("/", "1.0", "weekly"),
    urlEntry("/services/financial-ratios", "0.9", "weekly"),
    ...MAIN_MARKET_COMPANY_SYMBOLS.map((symbol) => urlEntry(`/company/${symbol}`, "0.8", "weekly")),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");
}

export default function handler(request, response) {
  if (request.method !== "GET") {
    response.status(405).send("Method Not Allowed");
    return;
  }

  response.setHeader("Content-Type", "application/xml; charset=utf-8");
  response.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  response.status(200).send(buildSitemap());
}
