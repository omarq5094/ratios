(function initializeFinancialAssistant() {
  "use strict";

  const STORAGE_KEY = "financialRatioAssistantHistoryV1";
  const MAX_STORED_MESSAGES = 12;
  const MAX_MESSAGE_LENGTH = 1200;
  const state = {
    busy: false,
    history: loadHistory(),
    analysisContext: null,
  };

  function loadHistory() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(saved)) return [];
      return saved
        .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .slice(-MAX_STORED_MESSAGES);
    } catch {
      return [];
    }
  }

  function saveHistory() {
    state.history = state.history.slice(-MAX_STORED_MESSAGES);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
    } catch {
      // تستمر المحادثة في الذاكرة إذا منع المتصفح التخزين المؤقت.
    }
  }

  const root = document.createElement("section");
  root.className = "ai-assistant";
  root.dir = "rtl";
  root.innerHTML = `
    <button class="ai-assistant-toggle" type="button" aria-expanded="false" aria-controls="aiAssistantPanel">
      <span class="ai-toggle-icon" aria-hidden="true">✦</span>
      <span class="ai-toggle-copy"><b>اسأل المحلل</b><small>مساعد محاسبي ذكي</small></span>
    </button>
    <aside id="aiAssistantPanel" class="ai-assistant-panel" aria-label="المحلل الذكي" aria-hidden="true">
      <header class="ai-assistant-header">
        <div class="ai-assistant-identity">
          <span class="ai-assistant-mark" aria-hidden="true">م</span>
          <div><strong>المحلل الذكي</strong><small><i></i> جاهز لمساعدتك</small></div>
        </div>
        <div class="ai-header-actions">
          <button class="ai-clear-button" type="button" title="مسح المحادثة">مسح</button>
          <button class="ai-close-button" type="button" aria-label="إغلاق المحادثة">×</button>
        </div>
      </header>
      <div class="ai-assistant-body">
        <div class="ai-assistant-messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        <div class="ai-screen-context" hidden>
          <span aria-hidden="true">◆</span>
          <strong></strong>
        </div>
        <div class="ai-quick-prompts" aria-label="أسئلة مقترحة"></div>
      </div>
      <div class="ai-privacy-note"><span aria-hidden="true">◇</span><b>تُرسل رسائل المحادثة فقط إلى خدمة الذكاء الاصطناعي.</b></div>
      <form class="ai-composer">
        <label class="sr-only" for="aiAssistantInput">اكتب سؤالك</label>
        <textarea id="aiAssistantInput" maxlength="${MAX_MESSAGE_LENGTH}" rows="1" placeholder="اكتب سؤالك عن المحاسبة أو الخدمة..."></textarea>
        <button class="ai-send-button" type="submit">إرسال</button>
      </form>
      <p class="ai-disclaimer">للتعليم والتحليل، وليست الإجابات توصية استثمارية.</p>
    </aside>
  `;
  document.body.append(root);

  const toggleButton = root.querySelector(".ai-assistant-toggle");
  const panel = root.querySelector(".ai-assistant-panel");
  const closeButton = root.querySelector(".ai-close-button");
  const clearButton = root.querySelector(".ai-clear-button");
  const form = root.querySelector(".ai-composer");
  const input = root.querySelector("textarea");
  const sendButton = root.querySelector(".ai-send-button");
  const messages = root.querySelector(".ai-assistant-messages");
  const screenContext = root.querySelector(".ai-screen-context");
  const screenContextLabel = screenContext.querySelector("strong");
  const quickPrompts = root.querySelector(".ai-quick-prompts");
  const privacyNoteText = root.querySelector(".ai-privacy-note b");

  const page = document.body.classList.contains("home-page")
    ? "home"
    : document.body.classList.contains("financial-ratios-guide-page")
      ? "guide"
    : document.body.classList.contains("financial-ratios-page")
      ? "calculator"
      : "site";
  const basePromptLabels = page === "home"
    ? ["ما خدمات المنصة؟", "ما فائدة المحاسبة؟", "كيف أبدأ؟"]
    : page === "calculator"
      ? ["كيف أستخدم الحاسبة؟", "أين أجد دليل النسب؟", "ما الفرق بين نسب الشركات والبنوك؟"]
      : page === "guide"
        ? ["ما أهم نسب التقييم؟", "ما الفرق بين P/E وP/B؟", "ما أهم نسب البنوك؟"]
      : ["ما الذي تقدمه المنصة؟", "كيف أصل إلى حاسبة النسب؟", "كيف يساعدني المحلل؟"];
  const welcomeMessage = page === "home"
    ? "مرحبًا، أنا المحلل الذكي. أشرح لك المنصة والمحاسبة، وأساعدك في اختيار الخدمة المناسبة."
    : page === "guide"
      ? "مرحبًا، أنا المحلل الذكي. أساعدك في فهم معادلات النسب واختيار المؤشرات المناسبة لنوع المنشأة."
      : "مرحبًا، أنا المحلل الذكي. أساعدك في استخدام الحاسبة وفهم النسب والنتائج الحالية.";

  function createMessage(role, content, options = {}) {
    const article = document.createElement("article");
    article.className = `ai-message ai-message-${role}`;
    if (options.pending) article.classList.add("is-pending");

    const avatar = document.createElement("span");
    avatar.className = "ai-message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = role === "assistant" ? "م" : "أنت";

    const bubble = document.createElement("div");
    bubble.className = "ai-message-bubble";
    if (options.pending) {
      bubble.setAttribute("aria-label", "يكتب المساعد");
      bubble.innerHTML = "<i></i><i></i><i></i>";
    } else {
      bubble.textContent = content;
    }

    article.append(avatar, bubble);
    messages.append(article);
    messages.scrollTop = messages.scrollHeight;
    return article;
  }

  function renderConversation() {
    messages.replaceChildren();
    createMessage("assistant", welcomeMessage);
    state.history.forEach((item) => createMessage(item.role, item.content));
  }

  function renderQuickPrompts() {
    quickPrompts.replaceChildren();
    const promptLabels = state.analysisContext
      ? ["حلل النتائج الحالية", "ما أبرز نقاط القوة؟", "ما المخاطر الظاهرة؟"]
      : basePromptLabels;
    promptLabels.forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => sendMessage(label));
      quickPrompts.append(button);
    });
  }

  function setAnalysisContext(context) {
    const company = context?.company;
    const ratios = Array.isArray(context?.ratios) ? context.ratios : [];
    state.analysisContext = company && ratios.length ? context : null;
    quickPrompts.hidden = false;

    if (!state.analysisContext) {
      screenContext.hidden = true;
      screenContextLabel.textContent = "";
      privacyNoteText.textContent = "تُرسل رسائل المحادثة فقط إلى خدمة الذكاء الاصطناعي.";
      renderQuickPrompts();
      return;
    }

    const name = String(company.name || "النتائج الحالية").trim();
    const symbol = String(company.symbol || "").replace(/\.SR$/i, "").trim();
    screenContextLabel.textContent = `بيانات الشاشة مرفقة: ${name}${symbol ? ` (${symbol})` : ""}`;
    screenContext.hidden = false;
    privacyNoteText.textContent = "عند الإرسال، تُرسل رسالتك وبيانات النتائج الظاهرة إلى خدمة الذكاء الاصطناعي.";
    renderQuickPrompts();
  }

  function setOpen(open) {
    root.classList.toggle("is-open", open);
    panel.setAttribute("aria-hidden", String(!open));
    toggleButton.setAttribute("aria-expanded", String(open));
    if (open) {
      window.setTimeout(() => input.focus(), 180);
      messages.scrollTop = messages.scrollHeight;
    } else {
      toggleButton.focus();
    }
  }

  function setBusy(busy) {
    state.busy = busy;
    input.disabled = busy;
    sendButton.disabled = busy;
    sendButton.textContent = busy ? "لحظة..." : "إرسال";
  }

  function resizeInput() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 108)}px`;
  }

  function errorText(status, payload) {
    if (payload?.message) return payload.message;
    if (status === 429) return "تم بلوغ الحد المؤقت للرسائل. حاول بعد قليل.";
    if (status >= 500) return "المساعد غير متاح مؤقتًا. حاول مرة أخرى بعد قليل.";
    return "تعذر إرسال الرسالة. تحقق من السؤال وحاول مجددًا.";
  }

  async function sendMessage(rawMessage) {
    const message = String(rawMessage || "").trim();
    if (!message || state.busy) return;

    const previousHistory = state.history.slice(-8);
    state.history.push({ role: "user", content: message });
    saveHistory();
    createMessage("user", message);
    input.value = "";
    resizeInput();
    quickPrompts.hidden = true;
    setBusy(true);
    const pending = createMessage("assistant", "", { pending: true });

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: previousHistory,
          page,
          analysisContext: state.analysisContext,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(errorText(response.status, payload)), { status: response.status });

      const reply = String(payload.reply || "").trim();
      if (!reply) throw new Error("لم تصل إجابة مكتملة. حاول إعادة صياغة السؤال.");
      pending.remove();
      state.history.push({ role: "assistant", content: reply });
      saveHistory();
      createMessage("assistant", reply);
    } catch (error) {
      pending.remove();
      const statusMessage = createMessage("assistant", error?.message || "تعذر الاتصال بالمساعد حاليًا.");
      statusMessage.classList.add("is-error");
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  toggleButton.addEventListener("click", () => setOpen(!root.classList.contains("is-open")));
  closeButton.addEventListener("click", () => setOpen(false));
  clearButton.addEventListener("click", () => {
    state.history = [];
    sessionStorage.removeItem(STORAGE_KEY);
    quickPrompts.hidden = false;
    renderConversation();
    input.focus();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener("input", resizeInput);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("is-open")) setOpen(false);
  });
  window.addEventListener("financial-analysis-context", (event) => setAnalysisContext(event.detail));

  renderConversation();
  setAnalysisContext(window.financialAnalysisContext || null);
})();
