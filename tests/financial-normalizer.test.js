import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompanyPayload,
  buildDividendHistory,
  detectCompanyMarket,
  normalizeCompanySymbol,
  normalizeSaudiSymbol,
} from "../lib/financial-normalizer.js";

test("يحوّل رمز تداول إلى صيغة Yahoo", () => {
  assert.equal(normalizeSaudiSymbol("2222"), "2222.SR");
  assert.equal(normalizeSaudiSymbol("٢٢٢٢"), "2222.SR");
  assert.equal(normalizeSaudiSymbol("2222.sr"), "2222.SR");
  assert.equal(normalizeSaudiSymbol("ARAMCO"), null);
});

test("يكتشف السوق الأمريكي والسعودي تلقائيًا من حقل واحد", () => {
  assert.equal(normalizeCompanySymbol("٢٢٢٢"), "2222.SR");
  assert.equal(normalizeCompanySymbol("aapl"), "AAPL");
  assert.equal(normalizeCompanySymbol(" BRK.B "), "BRK-B");
  assert.equal(normalizeCompanySymbol("123"), null);
  assert.equal(detectCompanyMarket("2222").label, "تداول");
  assert.equal(detectCompanyMarket("MSFT").label, "السوق الأمريكي");
});

test("يختار أحدث سنة مكتملة ويجلب أرقام السنة السابقة", () => {
  const result = buildCompanyPayload(
    "2222.SR",
    {
      price: {
        longName: "Saudi Arabian Oil Company",
        currency: "SAR",
        regularMarketPrice: 25,
        marketCap: 1_000,
      },
      defaultKeyStatistics: { enterpriseValue: 1_150, earningsQuarterlyGrowth: 0.08 },
      summaryDetail: { dividendRate: 1.5 },
      assetProfile: {
        sector: "Energy",
        industry: "Integrated Oil & Gas",
        website: "https://www.aramco.com/",
        longBusinessSummary: "تعمل الشركة في قطاع الطاقة وتقدم منتجات وخدمات مرتبطة بأعمالها الأساسية.",
      },
    },
    [
      {
        date: new Date("2024-12-31"),
        totalRevenue: 100,
        costOfRevenue: 40,
        operatingIncome: 30,
        netIncome: 20,
        currentAssets: 60,
        inventory: 10,
        currentLiabilities: 30,
        totalAssets: 200,
        totalDebt: 50,
        stockholdersEquity: 120,
        operatingCashFlow: 25,
        freeCashFlow: 15,
        EBITDA: 35,
        cashAndCashEquivalents: 20,
        cashDividendsPaid: -12,
        interestExpense: -3,
      },
      {
        date: new Date("2023-12-31"),
        totalRevenue: 90,
        totalAssets: 180,
        stockholdersEquity: 110,
        inventory: 8,
        netIncome: 18,
      },
    ],
  );

  assert.equal(result.period, "2024");
  assert.equal(result.fields.revenue, 100);
  assert.equal(result.fields.previousAssets, 180);
  assert.equal(result.fields.previousEquity, 110);
  assert.equal(result.fields.interestExpense, 3);
  assert.equal(result.fields.marketCap, 1_000);
  assert.equal(result.fields.enterpriseValue, 1_150);
  assert.equal(result.fields.freeCashFlow, 15);
  assert.equal(result.fields.ebitda, 35);
  assert.equal(result.fields.cashAndEquivalents, 20);
  assert.equal(result.fields.previousInventory, 8);
  assert.equal(result.fields.annualDividendPerShare, 1.5);
  assert.equal(result.fields.sharePrice, 25);
  assert.equal(result.fields.totalDividends, 12);
  assert.equal(result.fields.earningsGrowthPercent, 8);
  assert.equal(result.availableFieldCount, 24);
  assert.equal(result.totalFieldCount, 24);
  assert.equal(result.missingFields.length, 0);
  assert.equal(result.companyInfo.sector, "Energy");
  assert.equal(result.companyInfo.industry, "Integrated Oil & Gas");
  assert.equal(result.companyInfo.website, "https://www.aramco.com/");
  assert.match(result.companyInfo.description, /قطاع الطاقة/);
  assert.equal(result.market.id, "saudi");
  assert.equal(result.market.label, "تداول");
});

test("يبني بيانات شركة أمريكية بالدولار وهوية السوق الصحيحة", () => {
  const result = buildCompanyPayload(
    "AAPL",
    {
      price: { longName: "Apple Inc.", currency: "USD", regularMarketPrice: 200, marketCap: 3_000 },
      assetProfile: { sector: "Technology", industry: "Consumer Electronics" },
    },
    [{
      date: new Date("2025-09-30"),
      totalRevenue: 400,
      costOfRevenue: 220,
      operatingIncome: 120,
      netIncome: 100,
      currentAssets: 150,
      inventory: 10,
      currentLiabilities: 130,
      totalAssets: 500,
      totalDebt: 110,
      stockholdersEquity: 80,
    }],
  );

  assert.equal(result.symbol, "AAPL");
  assert.equal(result.market.id, "usa");
  assert.equal(result.market.label, "السوق الأمريكي");
  assert.equal(result.currency, "USD");
  assert.equal(result.companyName, "Apple Inc.");
});

test("يجمع توزيعات آخر خمس سنوات ويحسب انتظامها والتغير السنوي", () => {
  const result = buildDividendHistory(
    [
      { date: new Date("2022-03-01"), dividends: 0.5 },
      { date: new Date("2022-09-01"), dividends: 0.5 },
      { date: new Date("2023-03-01"), dividends: 0.6 },
      { date: new Date("2023-09-01"), dividends: 0.6 },
      { date: new Date("2024-06-01"), dividends: 1.2 },
      { date: new Date("2025-06-01"), dividends: 1.5 },
      { date: new Date("2026-06-01"), dividends: 0.8 },
      { date: new Date("2021-06-01"), dividends: 9 },
    ],
    new Date("2026-08-27T00:00:00Z"),
  );

  assert.equal(result.status, "available");
  assert.equal(result.years.length, 5);
  assert.equal(result.regularity, "منتظمة سنويًا");
  assert.equal(result.yearsWithDividends, 4);
  assert.equal(result.evaluatedYears, 4);
  assert.equal(result.years[0].year, 2026);
  assert.equal(result.years[0].isPartial, true);
  assert.equal(result.years[0].totalPerShare, 0.8);
  assert.equal(result.years[1].annualChangeAmount, 0.3);
  assert.equal(result.years.at(-1).paymentCount, 2);
});

test("يميز تعذر جلب سجل التوزيعات عن عدم وجود توزيعات", () => {
  const result = buildDividendHistory(null, new Date("2026-08-27T00:00:00Z"));
  assert.equal(result.status, "unavailable");
  assert.deepEqual(result.years, []);
});
