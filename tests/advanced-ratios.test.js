import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function loadCalculator() {
  const source = await readFile(new URL("../lib/advanced-ratios.js", import.meta.url), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context);
  return context.AdvancedFinancialRatios;
}

function completeValues() {
  return {
    marketCap: 1_000,
    enterpriseValue: 1_200,
    netProfit: 50,
    equity: 400,
    revenue: 500,
    freeCashFlow: 40,
    ebitda: 100,
    earningsGrowthPercent: 10,
    annualDividendPerShare: 2,
    sharePrice: 50,
    totalDividends: 20,
    totalDebt: 200,
    totalAssets: 800,
    costOfSales: 300,
    inventory: 50,
    previousInventory: 30,
    cashAndEquivalents: 80,
    operatingCashFlow: 70,
  };
}

test("يحسب المؤشرات السبعة عشر الجديدة من القيم المتاحة", async () => {
  const calculator = await loadCalculator();
  const results = Object.fromEntries(
    calculator.calculate(completeValues()).map((item) => [item.code, item]),
  );

  assert.equal(Object.keys(results).length, 17);
  for (const item of Object.values(results)) {
    assert.equal(typeof item.formula, "string");
    assert.ok(item.formula.length > 0);
  }
  assert.equal(results.market_cap.value, 1_000);
  assert.equal(results.pe.value, 20);
  assert.equal(results.pb.value, 2.5);
  assert.equal(results.ps.value, 2);
  assert.equal(results.p_fcf.value, 25);
  assert.equal(results.ev_ebitda.value, 12);
  assert.equal(results.ev_sales.value, 2.4);
  assert.equal(results.peg.value, 2);
  assert.equal(results.dividend_yield.value, 0.04);
  assert.equal(results.dividend_payout.value, 0.4);
  assert.equal(results.free_cash_flow_yield.value, 0.04);
  assert.equal(results.debt_assets.value, 0.25);
  assert.equal(results.asset_turnover.value, 0.625);
  assert.equal(results.inventory_turnover.value, 7.5);
  assert.equal(results.ebitda_margin.value, 0.2);
  assert.equal(results.net_debt_ebitda.value, 1.2);
  assert.equal(results.operating_cash_flow_margin.value, 0.14);
});

test("يحدد القيمة الناقصة بدل افتراض الصفر", async () => {
  const calculator = await loadCalculator();
  const values = completeValues();
  values.marketCap = null;
  const results = Object.fromEntries(
    calculator.calculate(values).map((item) => [item.code, item]),
  );

  assert.equal(results.market_cap.status, "missing");
  assert.deepEqual([...results.pe.missingFields], ["marketCap"]);
  assert.equal(results.pe.value, null);
  assert.equal(results.free_cash_flow_yield.status, "missing");
});

test("يعرض النسب السالبة كما حُسبت عند وجود خسارة", async () => {
  const calculator = await loadCalculator();
  const values = completeValues();
  values.netProfit = -10;
  const results = Object.fromEntries(
    calculator.calculate(values).map((item) => [item.code, item]),
  );

  assert.equal(results.pe.status, "available");
  assert.equal(results.pe.value, -100);
  assert.equal(results.peg.status, "available");
  assert.equal(results.peg.value, -10);
  assert.equal(results.dividend_payout.value, -2);
});

test("يمنع القسمة على صفر دون إخفاء القيم السالبة", async () => {
  const calculator = await loadCalculator();
  const values = completeValues();
  values.freeCashFlow = -40;
  values.ebitda = 0;
  const results = Object.fromEntries(
    calculator.calculate(values).map((item) => [item.code, item]),
  );

  assert.equal(results.p_fcf.value, -25);
  assert.equal(results.free_cash_flow_yield.value, -0.04);
  assert.equal(results.ev_ebitda.status, "invalid");
  assert.equal(results.ev_ebitda.value, null);
});
