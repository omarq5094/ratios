import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("واجهة المساعد محملة في صفحات الموقع الأساسية", async () => {
  const [indexHtml, ratiosHtml, guideHtml] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("financial-ratios.html", root), "utf8"),
    readFile(new URL("financial-ratios-guide.html", root), "utf8"),
  ]);
  assert.match(indexHtml, /<script src="\/assistant\.js"><\/script>/);
  assert.match(ratiosHtml, /<script src="\/assistant\.js"><\/script>/);
  assert.match(guideHtml, /<script src="\/assistant\.js"><\/script>/);
});

test("واجهة المساعد تتضمن عناصر الوصول والخصوصية", async () => {
  const source = await readFile(new URL("assistant.js", root), "utf8");
  assert.match(source, /aria-controls="aiAssistantPanel"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /تُرسل رسائل المحادثة فقط/);
  assert.match(source, /بيانات الشاشة مرفقة/);
  assert.match(source, /financial-analysis-context/);
  assert.match(source, /analysisContext: state\.analysisContext/);
  assert.match(source, /sessionStorage/);
  assert.doesNotMatch(source, /OPENAI_API_KEY/);
});

test("الثيم يتضمن العرض المتجاوب للمساعد", async () => {
  const css = await readFile(new URL("style.css", root), "utf8");
  assert.match(css, /\.ai-assistant-panel/);
  assert.match(css, /\.ai-screen-context/);
  assert.match(css, /backdrop-filter: blur\(36px\)/);
  assert.match(css, /\.ai-assistant \{[\s\S]*?bottom: 88px;/);
  assert.match(css, /\.ai-assistant-panel \{[\s\S]*?position: fixed;[\s\S]*?top: 16px;[\s\S]*?bottom: auto;/);
  assert.match(css, /\.ai-assistant\.is-open \.ai-assistant-toggle \{[\s\S]*?visibility: hidden;/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?\.ai-assistant \{ left: 12px; bottom: 72px; \}/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?top: 12px;[\s\S]*?height: calc\(100dvh - 24px\);/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.ai-assistant-panel/);
});
