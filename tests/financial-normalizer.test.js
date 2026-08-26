import assert from "node:assert/strict";
import test from "node:test";
import { buildCompanyPayload, normalizeSaudiSymbol } from "../lib/financial-normalizer.js";

test("يحوّل رمز تداول إلى صيغة Yahoo", () => {
  assert.equal(normalizeSaudiSymbol("2222"), "2222.SR");
  assert.equal(normalizeSaudiSymbol("٢٢٢٢"), "2222.SR");
  assert.equal(normalizeSaudiSymbol("2222.sr"), "2222.SR");
  assert.equal(normalizeSaudiSymbol("ARAMCO"), null);
});

test("يختار أحدث سنة مكتملة ويجلب أرقام السنة السابقة", () => {
  const result = buildCompanyPayload(
    "2222.SR",
    {
      price: { longName: "Saudi Arabian Oil Company", currency: "SAR" },
      assetProfile: { sector: "Energy", industry: "Oil & Gas Integrated" },
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
        interestExpense: -3,
      },
      {
        date: new Date("2023-12-31"),
        totalRevenue: 90,
        totalAssets: 180,
        stockholdersEquity: 110,
        netIncome: 18,
      },
    ],
  );

  assert.equal(result.period, "2024");
  assert.equal(result.fields.revenue, 100);
  assert.equal(result.fields.previousAssets, 180);
  assert.equal(result.fields.previousEquity, 110);
  assert.equal(result.fields.interestExpense, 3);
  assert.equal(result.missingFields.length, 0);
});
