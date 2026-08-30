import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildSitemap } from "../api/sitemap.js";

test("الصفحة الرئيسية توجيهية وتعرض الوصول السريع والخدمات", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /class="home-page"/);
  assert.match(html, /id="aboutAccounting"/);
  assert.match(html, /id="services"/);
  assert.match(html, /class="container quick-services-dock"/);
  assert.match(html, /href="\/services\/financial-ratios"/);
  assert.match(html, /<script src="\/assistant\.js"><\/script>/);
  assert.doesNotMatch(html, /id="financialForm"/);
});

test("الحاسبة ودليل النسب موجودان في صفحة خدمة واحدة", async () => {
  const html = await readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");
  const legacy = await readFile(new URL("../ratios.html", import.meta.url), "utf8");
  const guideScript = await readFile(new URL("../ratio-guide.js", import.meta.url), "utf8");

  assert.match(html, /id="financialForm"/);
  assert.match(html, /id="ratioGuide"/);
  assert.match(html, /id="ratioGuideGroups"/);
  assert.match(html, /data-guide-mode="operating"/);
  assert.match(html, /data-guide-mode="bank"/);
  assert.match(html, /<script src="\/ratio-guide\.js"><\/script>/);
  assert.doesNotMatch(html, /href="\/ratios\.html"/);
  assert.match(legacy, /window\.location\.replace\("\/services\/financial-ratios#ratioGuide"\)/);
  assert.match(guideScript, /AdvancedFinancialRatios/);
  assert.match(guideScript, /BankFinancialRatios/);
});

test("خريطة الموقع تفهرس المنصة وخدمة الحاسبة دون صفحة دليل منفصلة", () => {
  const sitemap = buildSitemap();
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/services\/financial-ratios<\/loc>/);
  assert.doesNotMatch(sitemap, /\/ratios\.html/);
});

test("قالب صفحات الشركات يستخدم صفحة خدمة الحاسبة", async () => {
  const source = await readFile(new URL("../api/company-page.js", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.match(source, /financial-ratios\.html/);
  assert.equal(config.functions["api/company-page.js"].includeFiles, "financial-ratios.html");
});
