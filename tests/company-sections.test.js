import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("تظهر معلومات الشركة قبل النسب وسجل التوزيعات بعدها", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
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
  const api = await readFile(new URL("../api/company-data.js", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");

  assert.match(api, /"assetProfile"/);
  assert.match(api, /yahooFinance\.chart/);
  assert.match(api, /events: "div"/);
  assert.match(script, /function renderCompanyInfo/);
  assert.match(script, /function renderDividendHistory/);
});
