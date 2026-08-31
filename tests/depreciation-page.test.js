import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("صفحة الإهلاك مرتبطة بالحاسبة والمحلل الذكي", async () => {
  const [html, script, assistant, vercel] = await Promise.all([
    readFile(new URL("../depreciation.html", import.meta.url), "utf8"),
    readFile(new URL("../depreciation.js", import.meta.url), "utf8"),
    readFile(new URL("../assistant.js", import.meta.url), "utf8"),
    readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ]);

  assert.match(html, /id="depreciationForm"/);
  assert.match(html, /id="depreciationScheduleBody"/);
  assert.match(html, /id="depreciationJournalEntry"/);
  assert.match(html, /id="depreciationChart"/);
  assert.match(html, /id="heroDepreciableValue"/);
  assert.doesNotMatch(html, /id="assetName"[^>]*required/);
  assert.doesNotMatch(html, /id="assetAccount"[^>]*required/);
  assert.doesNotMatch(html, /id="counterAccount"[^>]*required/);
  assert.match(html, /id="counterAccount"[^>]*><option value="">تلقائيًا: النقدية<\/option>/);
  assert.match(html, /https:\/\/www\.linkedin\.com\/in\/omar-al-ghrman-1b5795382\//);
  assert.match(html, /https:\/\/x\.com\/omar_saeed3/);
  assert.match(html, /tel:0533172872/);
  assert.match(html, /src="\/depreciation\.js"/);
  assert.match(html, /src="\/assistant\.js"/);
  assert.match(script, /contextType:\s*"depreciation"/);
  assert.match(script, /accounting-analysis-context/);
  assert.match(script, /assetName:\s*"آلة إنتاج"/);
  assert.match(script, /assetAccount:\s*"الآلات"/);
  assert.match(script, /counterAccount:\s*"النقدية"/);
  assert.match(script, /updateHeroPreview/);
  assert.match(script, /renderDepreciationChart/);
  assert.match(assistant, /depreciation-page/);
  assert.equal(JSON.parse(vercel).rewrites.some((item) => item.source === "/services/depreciation"), true);
});
