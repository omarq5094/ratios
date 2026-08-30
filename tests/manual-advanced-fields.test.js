import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const advancedFieldIds = [
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

test("advanced ratio fields are visible and manually editable", async () => {
  const html = await readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");

  assert.match(html, /<details class="optional-block" open>/);
  assert.doesNotMatch(html, /class="supplemental-data-store"/);

  for (const fieldId of advancedFieldIds) {
    assert.match(html, new RegExp(`id="${fieldId}"\\s+type="number"`));
    assert.doesNotMatch(html, new RegExp(`id="${fieldId}"\\s+type="hidden"`));
  }
});

test("واجهة الإصدار الجديد تعرض الهوية وبيانات المصدر وطريقة الحساب", async () => {
  const html = await readFile(new URL("../financial-ratios.html", import.meta.url), "utf8");

  assert.match(html, /محلل النسب المالية/);
  assert.doesNotMatch(html, /المقارن المالي/);
  assert.match(html, /id="importSourceBadge"/);
  assert.match(html, /id="importPeriodBadge"/);
  assert.match(html, /class="result-formula"/);
});
