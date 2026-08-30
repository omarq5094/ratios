const SITE_URL = "https://ratios-ashy.vercel.app";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainDescription(payload) {
  const symbol = String(payload.symbol || "").replace(/\.SR$/i, "");
  const name = payload.companyName || payload.shortName || `الشركة ${symbol}`;
  if (payload.companyType === "bank") {
    return `تحليل النسب المالية لبنك ${name}، رمز ${symbol}: التقييم والعائد والمؤشرات المصرفية وسجل التوزيعات وفق أحدث بيانات سنوية متاحة.`;
  }
  return `تحليل النسب المالية لشركة ${name}، رمز ${symbol}: الربحية والسيولة والمديونية والتقييم وسجل التوزيعات وفق أحدث بيانات سنوية متاحة.`;
}

function replaceMeta(html, selector, content) {
  const escapedContent = escapeHtml(content);
  const pattern = new RegExp(`(<meta\\s+${selector}\\s+content=")[^"]*("\\s*/?>)`, "i");
  return html.replace(pattern, `$1${escapedContent}$2`);
}

function replaceDocumentMeta(template, { title, description, canonical }) {
  let html = template.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = replaceMeta(html, 'name="description"', description);
  html = replaceMeta(html, 'property="og:title"', title);
  html = replaceMeta(html, 'property="og:description"', description);
  html = replaceMeta(html, 'property="og:url"', canonical);
  html = replaceMeta(html, 'name="twitter:title"', title);
  html = replaceMeta(html, 'name="twitter:description"', description);
  return html.replace(
    /(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/i,
    `$1${escapeHtml(canonical)}$2`,
  );
}

function safeBootstrapJson(payload) {
  return JSON.stringify(payload)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}

function companyIntro(payload, canonical) {
  const symbol = String(payload.symbol || "").replace(/\.SR$/i, "");
  const name = payload.companyName || payload.shortName || `الشركة ${symbol}`;
  const sector = payload.companyInfo?.sector || "القطاع غير متوفر";
  const industry = payload.companyInfo?.industry || "الصناعة غير متوفرة";
  const period = payload.period || "أحدث سنة متاحة";
  const description = payload.companyInfo?.description || "تتوفر تفاصيل النشاط ضمن بيانات الشركة عند اكتمال المصدر.";

  return `
      <section class="container company-seo-intro" aria-labelledby="companySeoTitle">
        <div>
          <span class="section-kicker">صفحة شركة مستقلة</span>
          <h1 id="companySeoTitle">تحليل ${escapeHtml(name)} <small>${escapeHtml(symbol)}</small></h1>
          <p>${escapeHtml(description)}</p>
          <div class="company-seo-meta">
            <span>${escapeHtml(sector)}</span>
            <span>${escapeHtml(industry)}</span>
            <span>السنة المالية ${escapeHtml(period)}</span>
          </div>
        </div>
        <div class="company-seo-actions">
          <a class="primary-button" href="#results">عرض نتائج التحليل</a>
          <a class="secondary-button" href="${escapeHtml(canonical)}">رابط الشركة الدائم</a>
        </div>
      </section>`;
}

export function renderCompanyDocument(template, payload) {
  const symbol = String(payload.symbol || "").replace(/\.SR$/i, "");
  const name = payload.companyName || payload.shortName || `الشركة ${symbol}`;
  const canonical = `${SITE_URL}/company/${encodeURIComponent(symbol)}`;
  const title = `تحليل ${name} (${symbol}) والنسب المالية | محلل النسب المالية`;
  const description = plainDescription(payload);

  return replaceDocumentMeta(template, { title, description, canonical })
    .replace("<!-- COMPANY_SEO_CONTENT -->", companyIntro(payload, canonical))
    .replace(
      "<!-- COMPANY_BOOTSTRAP -->",
      `<script id="companyBootstrap" type="application/json">${safeBootstrapJson(payload)}</script>`,
    );
}

export function renderCompanyErrorDocument(template, rawSymbol, message, status = 404) {
  const symbol = /^\d{4}$/.test(String(rawSymbol || "")) ? String(rawSymbol) : "غير معروف";
  const canonical = `${SITE_URL}/company/${encodeURIComponent(symbol)}`;
  const title = status >= 500 ? "تعذر تحميل التحليل | محلل النسب المالية" : `تحليل الشركة ${symbol} غير متوفر`;
  const description = message || "تعذر العثور على بيانات مالية مكتملة لهذه الشركة.";
  const errorSection = `
      <section class="container company-seo-intro company-seo-error" aria-labelledby="companySeoTitle">
        <div>
          <span class="section-kicker">تعذر تحميل صفحة الشركة</span>
          <h1 id="companySeoTitle">الرمز ${escapeHtml(symbol)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
        <a class="primary-button" href="/services/financial-ratios#calculator">تحليل رمز آخر</a>
      </section>`;

  return replaceDocumentMeta(template, { title, description, canonical })
    .replace("<!-- COMPANY_SEO_CONTENT -->", errorSection)
    .replace("<!-- COMPANY_BOOTSTRAP -->", "");
}

export { SITE_URL };
