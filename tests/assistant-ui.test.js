import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("واجهة المساعد محملة في صفحتي الموقع", async () => {
  const [indexHtml, ratiosHtml] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("ratios.html", root), "utf8"),
  ]);
  assert.match(indexHtml, /<script src="assistant\.js"><\/script>/);
  assert.match(ratiosHtml, /<script src="assistant\.js"><\/script>/);
});

test("واجهة المساعد تتضمن عناصر الوصول والخصوصية", async () => {
  const source = await readFile(new URL("assistant.js", root), "utf8");
  assert.match(source, /aria-controls="aiAssistantPanel"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /تُرسل رسائل المحادثة فقط/);
  assert.match(source, /sessionStorage/);
  assert.doesNotMatch(source, /OPENAI_API_KEY/);
});

test("الثيم يتضمن العرض المتجاوب للمساعد", async () => {
  const css = await readFile(new URL("style.css", root), "utf8");
  assert.match(css, /\.ai-assistant-panel/);
  assert.match(css, /backdrop-filter: blur\(36px\)/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.ai-assistant-panel/);
});
