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
  assert.match(html, /src="\/depreciation\.js"/);
  assert.match(html, /src="\/assistant\.js"/);
  assert.match(script, /contextType:\s*"depreciation"/);
  assert.match(script, /accounting-analysis-context/);
  assert.match(assistant, /depreciation-page/);
  assert.equal(JSON.parse(vercel).rewrites.some((item) => item.source === "/services/depreciation"), true);
});

