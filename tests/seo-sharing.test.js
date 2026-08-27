import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderCompanyDocument } from "../lib/company-page-renderer.js";
import { buildSitemap } from "../api/sitemap.js";
import { MAIN_MARKET_COMPANY_SYMBOLS } from "../lib/company-symbols.js";
import { arabicCompanyName } from "../lib/company-names-ar.js";

const samplePayload = {
  symbol: "2222.SR",
  companyName: "أرامكو السعودية",
  shortName: "أرامكو",
  period: "2025",
  companyInfo: {
    sector: "الطاقة",
    industry: "النفط والغاز",
    description: "شركة طاقة متكاملة.",
  },
  fields: { revenue: 1 },
  source: { provider: "Yahoo Finance" },
};

test("ينشئ صفحة شركة بعنوان ووصف ورابط مستقلين", async () => {
  const template = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const html = renderCompanyDocument(template, samplePayload);

  assert.match(html, /<title>تحليل أرامكو السعودية \(2222\)/);
  assert.match(html, /rel="canonical" href="https:\/\/ratios-ashy\.vercel\.app\/company\/2222"/);
  assert.match(html, /property="og:url" content="https:\/\/ratios-ashy\.vercel\.app\/company\/2222"/);
  assert.match(html, /id="companySeoTitle">تحليل أرامكو السعودية/);
  assert.match(html, /id="companyBootstrap"/);
  assert.doesNotMatch(html, /<!-- COMPANY_(?:SEO_CONTENT|BOOTSTRAP) -->/);
});

test("يمنع كسر HTML عند وجود نص غير موثوق في بيانات الشركة", async () => {
  const template = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const html = renderCompanyDocument(template, {
    ...samplePayload,
    companyName: "شركة </title><script>alert(1)</script>",
    companyInfo: { ...samplePayload.companyInfo, description: "<img src=x onerror=alert(1)>" },
  });

  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /\\u003c\/title\\u003e/);
});

test("تحتوي خريطة Google على الصفحة الرئيسية وصفحات الشركات", () => {
  const sitemap = buildSitemap();
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/company\/2222<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/company\/1120<\/loc>/);
  assert.ok((sitemap.match(/<url>/g) || []).length > 200);
});

test("لكل شركة مفهرسة اسم عربي مستخدم في Google والمشاركة", () => {
  assert.equal(MAIN_MARKET_COMPANY_SYMBOLS.length, 241);
  for (const symbol of MAIN_MARKET_COMPANY_SYMBOLS) {
    assert.ok(arabicCompanyName(symbol), `الاسم العربي غير موجود للرمز ${symbol}`);
  }
  assert.equal(arabicCompanyName("2222.SR"), "أرامكو السعودية");
});

test("تظهر المشاركة تحت سجل التوزيعات وتستخدم صورة بلا QR", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
  const dividendPosition = html.indexOf('id="dividendHistoryPanel"');
  const sharePosition = html.indexOf('id="shareAnalysisPanel"');

  assert.ok(dividendPosition > -1 && sharePosition > dividendPosition);
  assert.match(script, /canvas\.width = 1080/);
  assert.match(script, /navigator\.share/);
  assert.match(script, /https:\/\/ratios-ashy\.vercel\.app\//);
  assert.doesNotMatch(`${html}\n${script}`, /(?:qr-code|qrcode|رمز الاستجابة)/i);
});

test("يوجه Vercel رابط الشركة وملف sitemap إلى الوظائف الصحيحة", async () => {
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(config.rewrites[0], {
    source: "/company/:symbol",
    destination: "/api/company-page?symbol=:symbol",
  });
  assert.deepEqual(config.rewrites[1], {
    source: "/sitemap.xml",
    destination: "/api/sitemap",
  });
});
