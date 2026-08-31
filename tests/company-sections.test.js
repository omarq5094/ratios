import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("تظهر معلومات الشركة قبل النسب وسجل التوزيعات بعدها", async () => {
  const html = await readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");
  const companyPosition = html.indexOf('id="companyInfoPanel"');
  const ratioPosition = html.indexOf('id="ratioGrid"');
  const operationsPosition = html.indexOf('id="operationsRatioGrid"');
  const dividendPosition = html.indexOf('id="dividendHistoryPanel"');

  assert.ok(companyPosition > -1 && companyPosition < ratioPosition);
  assert.ok(dividendPosition > operationsPosition);
  assert.match(html, /القطاع/);
  assert.match(html, /الصناعة/);
  assert.match(html, /الموقع الإلكتروني/);
  assert.match(html, /وصف مختصر للنشاط/);
  assert.match(html, /التغير السنوي/);
});

test("تجلب الخدمة ملف الشركة وسجل التوزيعات من Yahoo", async () => {
  const service = await readFile(new URL("../lib/company-service.js", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");

  assert.match(service, /"assetProfile"/);
  assert.match(service, /yahooFinance\.chart/);
  assert.match(service, /events: "div"/);
  assert.match(script, /function renderCompanyInfo/);
  assert.match(script, /function renderDividendHistory/);
});

test("حقل الرمز الواحد يكتشف السوق السعودي والأمريكي تلقائيًا", async () => {
  const html = await readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
  const service = await readFile(new URL("../lib/company-service.js", import.meta.url), "utf8");

  assert.match(html, /id="detectedMarketLabel"/);
  assert.match(html, /placeholder="2222 أو AAPL"/);
  assert.match(html, /inputmode="text"/);
  assert.match(script, /function detectCompanyInput/);
  assert.match(script, /السوق الأمريكي/);
  assert.match(service, /normalizeCompanySymbol/);
});

test("الإدخال اليدوي يبقى إلزاميًا والجلب التلقائي يسمح بنتائج جزئية", async () => {
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
  const css = await readFile(new URL("../style.css", import.meta.url), "utf8");

  assert.match(script, /companyType && !automaticImportMode/);
  assert.match(script, /const coreValue = importedCompanyContext \? nullableValueOf : valueOf/);
  assert.match(script, /تم حساب \$\{availableCount\} من \$\{totalCount\} مؤشرًا/);
  assert.match(css, /\.form-card\.auto-import-mode \.field > span b \{ display: none; \}/);
});
