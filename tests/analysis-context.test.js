import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../script.js", import.meta.url), "utf8");

test("يبني سياق المساعد من نتائج الشركة والنسب والتوزيعات", () => {
  assert.match(source, /function buildAssistantContext/);
  assert.match(source, /financialInputs:/);
  assert.match(source, /ratios: \[\.\.\.primaryRatios, \.\.\.advancedRatios\]/);
  assert.match(source, /dividendHistory: imported\?\.dividendHistory/);
  assert.match(source, /sourceType: imported \? "yahoo" : "manual"/);
});

test("ينشر السياق بعد الحساب ويلغيه عند تغيير البيانات أو إعادة الضبط", () => {
  assert.match(source, /publishAssistantContext\(buildAssistantContext\(values, ratios\)\)/);
  assert.ok(source.match(/publishAssistantContext\(null\)/g)?.length >= 2);
  assert.match(source, /new window\.CustomEvent\(ASSISTANT_CONTEXT_EVENT/);
});
