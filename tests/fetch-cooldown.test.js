import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class FakeElement {
  constructor() {
    this.classList = { add() {}, remove() {} };
    this.dataset = {};
    this.disabled = false;
    this.hidden = false;
    this.textContent = "";
    this.value = "";
  }

  addEventListener() {}
  append() {}
  closest() {
    return { classList: this.classList };
  }
  focus() {}
  replaceChildren() {}
  reportValidity() {
    return true;
  }
  reset() {}
  scrollIntoView() {}
  setAttribute() {}
}

function createBrowserContext(nowRef) {
  const ids = [
    "financialForm",
    "formMessage",
    "results",
    "ratioGrid",
    "tickerInput",
    "fetchCompanyButton",
    "dataFetchStatus",
    "importSummary",
    "valuationRatioGrid",
    "operationsRatioGrid",
    "missingDataPanel",
    "missingFieldsGrid",
    "applyMissingFieldsButton",
    "projectName",
    "importCompanyName",
    "importCompanyMeta",
    "importCurrencyBadge",
    "importCoverageBadge",
    "importSourceLink",
    "importMissingNote",
    "currentRatioValue",
    "quickRatioValue",
    "roaValue",
    "coverageValue",
    "resultTitle",
    "resultSummary",
    "resetButton",
    "calculator",
    "revenue",
    "costOfSales",
    "operatingProfit",
    "netProfit",
    "currentAssets",
    "inventory",
    "currentLiabilities",
    "totalAssets",
    "totalDebt",
    "equity",
    "previousAssets",
    "previousEquity",
    "operatingCashFlow",
    "interestExpense",
    "marketCap",
    "freeCashFlow",
    "enterpriseValue",
    "ebitda",
    "cashAndEquivalents",
    "previousInventory",
    "annualDividendPerShare",
    "sharePrice",
    "totalDividends",
    "earningsGrowthPercent",
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
  const storage = new Map();
  const document = {
    createElement: () => new FakeElement(),
    querySelector: (selector) => elements[selector.slice(1)],
    querySelectorAll: () => [],
  };
  class FakeDate extends Date {
    static now() {
      return nowRef.value;
    }
  }
  const window = {
    clearTimeout() {},
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
      setItem: (key, value) => storage.set(key, value),
    },
    location: { protocol: "https:" },
    setTimeout: () => 1,
  };
  const payload = {
    symbol: "2222.SR",
    companyName: "شركة اختبار",
    currency: "SAR",
    fields: Object.fromEntries(Object.keys(elements).map((key) => [key, 100])),
    availableFieldCount: 14,
    totalFieldCount: 14,
    missingFields: [],
    source: { provider: "Yahoo Finance", url: "https://finance.yahoo.com/" },
  };

  return {
    context: vm.createContext({
      AbortController,
      console,
      Date: FakeDate,
      document,
      fetch: async () => ({
        headers: { get: () => "application/json" },
        json: async () => payload,
        ok: true,
      }),
      Intl,
      Number,
      window,
    }),
    elements,
    storage,
  };
}

test("يمنع طلب Yahoo جديدًا لمدة 15 ثانية ويستمر بعد الطلب", async () => {
  const nowRef = { value: 1_000 };
  const { context, elements, storage } = createBrowserContext(nowRef);
  const advancedSource = await readFile(new URL("../lib/advanced-ratios.js", import.meta.url), "utf8");
  const source = await readFile(new URL("../script.js", import.meta.url), "utf8");
  vm.runInContext(advancedSource, context);
  context.window.AdvancedFinancialRatios = context.AdvancedFinancialRatios;
  vm.runInContext(source, context);

  elements.tickerInput.value = "2222";
  await context.fetchCompanyData();

  assert.equal(elements.fetchCompanyButton.disabled, true);
  assert.equal(elements.fetchCompanyButton.dataset.state, "cooldown");
  assert.match(elements.fetchCompanyButton.textContent, /15/);
  assert.equal(storage.get("financialBenchmarkYahooNextFetchAt"), "16000");

  nowRef.value = 16_000;
  context.updateFetchButton();

  assert.equal(elements.fetchCompanyButton.disabled, false);
  assert.equal(elements.fetchCompanyButton.textContent, "جلب البيانات");
  assert.equal(storage.has("financialBenchmarkYahooNextFetchAt"), false);
});
