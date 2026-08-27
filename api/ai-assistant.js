import { createHash } from "node:crypto";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-terra";
const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_ITEMS = 8;
const MAX_HISTORY_CHARACTERS = 6000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 8;
const requestBuckets = new Map();

const SYSTEM_INSTRUCTIONS = `
أنت "المحلل الذكي"، المساعد الرسمي لموقع "محلل النسب المالية" العربي.

نطاقك:
- شرح طريقة استخدام الموقع والتعبئة التلقائية من Yahoo Finance والإدخال اليدوي.
- شرح النسب المالية ومعادلاتها وفائدتها العملية: الربحية، السيولة، المديونية، العائد، التقييم، التوزيعات، الكفاءة والتدفقات النقدية.
- توضيح البيانات الناقصة، والقيم السالبة، وحالة المقام صفرًا دون اختراع أرقام.
- المقارنة التعليمية بين النسب، ومساعدة المستخدم على فهم نتيجة يذكرها بنفسه.

قواعد الرد:
- أجب باللغة العربية الفصحى الواضحة، وابدأ بالمقصود العملي ثم التفاصيل الضرورية.
- اجعل الإجابة موجزة غالبًا، واستخدم نقاطًا قصيرة فقط عندما تحسن الوضوح.
- لا تستخدم رموز الأسهم الاتجاهية.
- لا تقدم توصية شراء أو بيع، ولا سعرًا مستهدفًا، ولا تعد بعائد. وضح أن التحليل تعليمي وأن القرار يحتاج القوائم والإعلانات الرسمية.
- لا تدّع أنك ترى بيانات الحاسبة أو نتائج المستخدم. إذا احتجت قيمة فاطلب منه كتابة اسم النسبة وقيمتها.
- لا تدّع أن Yahoo Finance مصدر رسمي، ونبّه إلى احتمال نقص البيانات أو اختلاف الفترة والعملة.
- إذا كان السؤال خارج الموقع أو التحليل المالي، وجّه المستخدم بلطف إلى نطاقك.
- إذا لم تكن المعلومة مؤكدة، صرّح بذلك بدلًا من التخمين.

حقائق الموقع:
- يحسب الموقع 26 مؤشرًا، ويعرض النتيجة وطريقة الحساب وتفسيرًا مبسطًا.
- يمكن للمستخدم تعديل الأرقام التي جلبها Yahoo Finance قبل الحساب.
- القسمة على صفر لا تنتج رقمًا، بينما القيم السالبة تُعرض كما حُسبت.
- حساب النسب يتم داخل المتصفح. رسائل هذه المحادثة وحدها تُرسل إلى خدمة الذكاء الاصطناعي عند الضغط على إرسال.
`.trim();

function sendJson(response, status, payload) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(payload);
}

function normalizeBody(body) {
  if (body && typeof body === "object") return body;
  if (typeof body !== "string") return {};
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function normalizeMessage(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];

  const normalized = [];
  let totalCharacters = 0;
  for (const item of value.slice(-MAX_HISTORY_ITEMS)) {
    if (!item || !["user", "assistant"].includes(item.role)) continue;
    const content = normalizeMessage(item.content).slice(0, MAX_MESSAGE_LENGTH);
    if (!content) continue;
    if (totalCharacters + content.length > MAX_HISTORY_CHARACTERS) break;
    totalCharacters += content.length;
    normalized.push({ role: item.role, content });
  }
  return normalized;
}

function clientIdentifier(request) {
  const forwarded = String(request.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(request.headers?.["x-real-ip"] || "unknown");
}

function isSameOriginRequest(request) {
  const fetchSite = String(request.headers?.["sec-fetch-site"] || "").toLowerCase();
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) return false;

  const origin = request.headers?.origin;
  const host = request.headers?.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function consumeRateLimit(identifier, now = Date.now()) {
  if (requestBuckets.size > 2000) {
    for (const [key, bucket] of requestBuckets) {
      if (bucket.resetAt <= now) requestBuckets.delete(key);
    }
  }

  const current = requestBuckets.get(identifier);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_REQUESTS) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

function safetyIdentifier(request) {
  return createHash("sha256")
    .update(`financial-ratio-assistant:${clientIdentifier(request)}`)
    .digest("hex")
    .slice(0, 32);
}

function extractOutputText(payload) {
  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function pageInstruction(page) {
  if (page === "guide") return "المستخدم موجود الآن في صفحة دليل النسب.";
  if (page === "calculator") return "المستخدم موجود الآن في صفحة الحاسبة والنتائج.";
  return "المستخدم موجود داخل موقع محلل النسب المالية.";
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "METHOD_NOT_ALLOWED", message: "هذه الخدمة تقبل رسائل المحادثة فقط." });
    return;
  }

  if (!isSameOriginRequest(request)) {
    sendJson(response, 403, { error: "INVALID_ORIGIN", message: "تعذر التحقق من مصدر الطلب." });
    return;
  }

  const rateLimit = consumeRateLimit(clientIdentifier(request));
  if (!rateLimit.allowed) {
    response.setHeader("Retry-After", String(rateLimit.retryAfter));
    sendJson(response, 429, {
      error: "RATE_LIMITED",
      message: `تم بلوغ الحد المؤقت للرسائل. حاول بعد ${rateLimit.retryAfter} ثانية.`,
    });
    return;
  }

  const body = normalizeBody(request.body);
  const message = normalizeMessage(body.message);
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    sendJson(response, 400, {
      error: "INVALID_MESSAGE",
      message: `اكتب سؤالًا لا يتجاوز ${MAX_MESSAGE_LENGTH} حرفًا.`,
    });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    sendJson(response, 503, {
      error: "ASSISTANT_NOT_CONFIGURED",
      message: "المساعد غير مهيأ بعد. أضف مفتاح OpenAI إلى إعدادات المشروع.",
    });
    return;
  }

  const history = normalizeHistory(body.history);
  const model = process.env.OPENAI_AI_MODEL || DEFAULT_MODEL;
  const input = [...history, { role: "user", content: message }];

  try {
    const openAIResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: `${SYSTEM_INSTRUCTIONS}\n\n${pageInstruction(body.page)}`,
        input,
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        max_output_tokens: 700,
        safety_identifier: safetyIdentifier(request),
        store: false,
      }),
    });

    const payload = await openAIResponse.json().catch(() => ({}));
    if (!openAIResponse.ok) {
      console.error("OpenAI assistant request failed", {
        status: openAIResponse.status,
        requestId: openAIResponse.headers.get("x-request-id") || null,
        code: payload?.error?.code || null,
      });

      if (openAIResponse.status === 429) {
        sendJson(response, 429, { error: "OPENAI_RATE_LIMIT", message: "المساعد مشغول حاليًا. حاول بعد قليل." });
        return;
      }
      if ([401, 403].includes(openAIResponse.status)) {
        sendJson(response, 503, { error: "OPENAI_AUTH", message: "تعذر تشغيل المساعد بسبب إعداد الخدمة." });
        return;
      }
      sendJson(response, 502, { error: "OPENAI_ERROR", message: "تعذر الحصول على إجابة الآن. حاول مرة أخرى." });
      return;
    }

    const reply = extractOutputText(payload);
    if (!reply) {
      sendJson(response, 502, { error: "EMPTY_RESPONSE", message: "لم تصل إجابة مكتملة. أعد صياغة السؤال وحاول مجددًا." });
      return;
    }

    sendJson(response, 200, { reply, model });
  } catch (error) {
    console.error("OpenAI assistant network failure", { message: String(error?.message || error) });
    sendJson(response, 502, { error: "NETWORK_ERROR", message: "تعذر الاتصال بالمساعد الآن. تحقق من الشبكة وحاول لاحقًا." });
  }
}

export const assistantInternals = {
  extractOutputText,
  normalizeHistory,
  normalizeMessage,
};
