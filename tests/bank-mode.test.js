import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { detectCompanyType } from "../lib/company-type.js";
import { buildCompanyPayload } from "../lib/financial-normalizer.js";

test("يكتشف البنوك السعودية دون تصنيف شركات الخدمات المالية الأخرى كبنوك", () => {
  assert.equal(detectCompanyType({ symbol: "1120.SR" }), "bank");
  assert.equal(detectCompanyType({ industry: "Banks - Regional", sector: "Financial Services" }), "bank");
  assert.equal(detectCompanyType({ industry: "Insurance - Diversified", sector: "Financial Services" }), "operating");
});

test("يقبل قائمة البنك دون اشتراط المخزون والسيولة التشغيلية", () => {
  const result = buildCompanyPayload(
    "1120.SR",
    {
      price: { longName: "مصرف اختبار", currency: "SAR", marketCap: 500, regularMarketPrice: 50 },
      summaryDetail: { dividendRate: 2 },
      assetProfile: { sector: "Financial Services", industry: "Banks - Regional" },
    },
    [{
      date: new Date("2025-12-31"),
      netIncome: 20,
      totalAssets: 1_000,
      stockholdersEquity: 150,
      netInterestIncome: 35,
      totalRevenue: 70,
      operatingExpense: 25,
      totalLoans: 600,
      totalDeposits: 720,
      provisionForLoanLosses: 8,
    }],
  );

  assert.equal(result.companyType, "bank");
  assert.equal(result.fields.currentAssets, null);
  assert.equal(result.fields.netInterestIncome, 35);
  assert.equal(result.fields.operatingExpenses, 25);
  assert.equal(result.fields.customerDeposits, 720);
  assert.equal(result.totalFieldCount, 19);
  assert.ok(!result.missingFields.includes("inventory"));
  assert.ok(!result.missingFields.includes("currentLiabilities"));
});

test("يحسب المؤشرات المصرفية ويمنع القسمة على صفر", async () => {
  const source = await readFile(new URL("../lib/bank-ratios.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context);

  const results = Object.fromEntries(context.BankFinancialRatios.calculate({
    marketCap: 500,
    netProfit: 20,
    equity: 150,
    annualDividendPerShare: 2,
    sharePrice: 50,
    totalDividends: 10,
    netInterestIncome: 35,
    averageEarningAssets: 700,
    operatingExpenses: 25,
    operatingIncome: 70,
    totalLoans: 600,
    customerDeposits: 0,
    nonPerformingLoans: 12,
    loanLossProvisions: 18,
    regulatoryCapital: 130,
    riskWeightedAssets: 800,
  }).map((item) => [item.code, item]));

  assert.equal(results.pe.value, 25);
  assert.equal(results.nim.value, 0.05);
  assert.equal(results.npl.value, 0.02);
  assert.equal(results.npl_coverage.value, 1.5);
  assert.equal(results.loan_deposit.status, "invalid");
});

test("واجهة الإدخال اليدوي ونافذة المشاركة تطابقان وضع البنوك", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../script.js", import.meta.url), "utf8");
  const resultNotePosition = html.indexOf('class="result-note"');
  const shareLauncherPosition = html.indexOf('id="shareAnalysisLauncher"');

  assert.match(html, /id="companyType"\s+required/);
  assert.match(html, /<option value="bank">بنك<\/option>/);
  assert.match(html, /id="netInterestIncome"/);
  assert.match(html, /id="nonPerformingLoans"/);
  assert.match(html, /id="shareAnalysisModal"[^>]+aria-modal="true"/);
  assert.ok(shareLauncherPosition > resultNotePosition);
  assert.match(script, /financialPositionPanel\.hidden = companyType !== "operating"/);
  assert.match(script, /bankRatioApi\.calculate\(values\)/);
});
