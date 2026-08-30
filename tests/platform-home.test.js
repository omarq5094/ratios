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

test("الحاسبة ودليل النسب صفحتان مترابطتان ضمن الخدمة نفسها", async () => {
  const calculator = await readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");
  const guide = await readFile(new URL("../financial-ratios-guide.html", import.meta.url), "utf8");
  const legacy = await readFile(new URL("../ratios.html", import.meta.url), "utf8");
  const guideScript = await readFile(new URL("../ratio-guide.js", import.meta.url), "utf8");

  assert.match(calculator, /id="financialForm"/);
  assert.doesNotMatch(calculator, /id="ratioGuide"/);
  assert.doesNotMatch(calculator, /<script src="\/ratio-guide\.js"><\/script>/);
  assert.match(calculator, /href="\/services\/financial-ratios\/guide"/);
  assert.doesNotMatch(guide, /id="financialForm"/);
  assert.match(guide, /class="financial-ratios-guide-page"/);
  assert.match(guide, /id="ratioGuide"/);
  assert.match(guide, /id="ratioGuideGroups"/);
  assert.match(guide, /data-guide-mode="operating"/);
  assert.match(guide, /data-guide-mode="bank"/);
  assert.match(guide, /<script src="\/ratio-guide\.js"><\/script>/);
  assert.match(legacy, /window\.location\.replace\("\/services\/financial-ratios\/guide"\)/);
  assert.match(guideScript, /AdvancedFinancialRatios/);
  assert.match(guideScript, /BankFinancialRatios/);
});

test("خريطة الموقع تفهرس المنصة والحاسبة وصفحة الدليل المستقلة", () => {
  const sitemap = buildSitemap();
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/services\/financial-ratios<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/ratios-ashy\.vercel\.app\/services\/financial-ratios\/guide<\/loc>/);
  assert.doesNotMatch(sitemap, /\/ratios\.html/);
});

test("قالب صفحات الشركات يستخدم صفحة خدمة الحاسبة", async () => {
  const source = await readFile(new URL("../api/company-page.js", import.meta.url), "utf8");
  const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

  assert.match(source, /financial-ratios\.html/);
  assert.equal(config.functions["api/company-page.js"].includeFiles, "financial-ratios.html");
  assert.deepEqual(config.rewrites[3], {
    source: "/services/financial-ratios/guide",
    destination: "/financial-ratios-guide.html",
  });
});
