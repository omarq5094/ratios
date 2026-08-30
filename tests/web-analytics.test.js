import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const analyticsTag = /<script defer src="\/_vercel\/insights\/script\.js"><\/script>/g;

test("تتبع Vercel Analytics محمل مرة واحدة في كل صفحة أساسية", async () => {
  const pages = ["index.html", "financial-ratios.html", "financial-ratios-guide.html"];

  for (const page of pages) {
    const html = await readFile(new URL(page, root), "utf8");
    assert.equal((html.match(analyticsTag) || []).length, 1, `كود التتبع غير صحيح في ${page}`);
  }
});

test("قالب صفحات الشركات يرث كود التتبع من صفحة الحاسبة", async () => {
  const companyPageSource = await readFile(new URL("api/company-page.js", root), "utf8");
  const template = await readFile(new URL("financial-ratios.html", root), "utf8");

  assert.match(companyPageSource, /financial-ratios\.html/);
  assert.match(template, analyticsTag);
});
