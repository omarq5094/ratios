(function initializeIntegratedRatioGuide() {
  "use strict";

  const container = document.querySelector("#ratioGuideGroups");
  if (!container) return;

  const advancedApi = window.AdvancedFinancialRatios;
  const bankApi = window.BankFinancialRatios;
  const modeButtons = [...document.querySelectorAll("[data-guide-mode]")];

  const operatingCore = [
    { code: "GM", label: "هامش مجمل الربح", group: "profitability", formula: "(الإيرادات − تكلفة المبيعات) ÷ الإيرادات × 100", description: "المتبقي من الإيرادات بعد تكلفة المبيعات المباشرة." },
    { code: "OM", label: "هامش التشغيل", group: "profitability", formula: "الربح التشغيلي ÷ الإيرادات × 100", description: "ربحية النشاط الأساسي بعد مصروفات التشغيل." },
    { code: "NM", label: "هامش صافي الربح", group: "profitability", formula: "صافي الربح ÷ الإيرادات × 100", description: "الربح النهائي المتبقي من كل ريال إيرادات." },
    { code: "ROA", label: "العائد على الأصول", group: "profitability", formula: "صافي الربح ÷ متوسط إجمالي الأصول × 100", description: "كفاءة الأصول في توليد صافي الربح." },
    { code: "ROE", label: "العائد على حقوق الملكية", group: "profitability", formula: "صافي الربح ÷ متوسط حقوق الملكية × 100", description: "كفاءة أموال الملاك في توليد صافي الربح." },
    { code: "CR", label: "نسبة التداول", group: "liquidity", formula: "الأصول المتداولة ÷ الالتزامات المتداولة", description: "قدرة المنشأة على تغطية التزاماتها القصيرة." },
    { code: "QR", label: "النسبة السريعة", group: "liquidity", formula: "(الأصول المتداولة − المخزون) ÷ الالتزامات المتداولة", description: "السيولة المتاحة دون الاعتماد على بيع المخزون." },
    { code: "D/E", label: "الديون إلى حقوق الملكية", group: "liquidity", formula: "إجمالي الديون ÷ حقوق الملكية", description: "حجم التمويل بالدين مقارنة بأموال الملاك." },
    { code: "IC", label: "تغطية تكلفة التمويل", group: "liquidity", formula: "الربح التشغيلي ÷ مصروف التمويل", description: "قدرة النشاط الأساسي على تغطية تكلفة التمويل." },
  ];

  const bankCore = [
    { code: "ROA", label: "العائد على الأصول", group: "returns", formula: "صافي الربح ÷ متوسط إجمالي الأصول × 100", description: "كفاءة أصول البنك في توليد صافي الربح." },
    { code: "ROE", label: "العائد على حقوق الملكية", group: "returns", formula: "صافي الربح ÷ متوسط حقوق الملكية × 100", description: "العائد المتولد على أموال مساهمي البنك." },
  ];

  const operatingGroups = [
    { id: "profitability", number: "01", kicker: "الربحية والعائد", title: "كم تحقق المنشأة من أعمالها؟" },
    { id: "liquidity", number: "02", kicker: "السيولة والتمويل", title: "هل تستطيع الوفاء بالتزاماتها؟" },
    { id: "valuation", number: "03", kicker: "التقييم والتوزيعات", title: "ماذا يدفع السوق مقابل النتائج؟" },
    { id: "efficiency", number: "04", kicker: "الكفاءة والنقد", title: "كيف تستخدم المنشأة مواردها؟" },
  ];

  const bankGroups = [
    { id: "returns", number: "01", kicker: "العائد والتقييم", title: "ما عائد البنك وكيف يسعّره السوق؟" },
    { id: "banking", number: "02", kicker: "الكفاءة المصرفية", title: "كيف يولد البنك دخله ويوظف ودائعه؟" },
    { id: "risk", number: "03", kicker: "الائتمان ورأس المال", title: "ما جودة التمويل وقدرة البنك على امتصاص المخاطر؟" },
  ];

  const operatingCodes = Object.freeze({
    market_cap: "MC", pe: "P/E", pb: "P/B", ps: "P/S", p_fcf: "P/FCF",
    ev_ebitda: "EV/E", ev_sales: "EV/S", peg: "PEG", dividend_yield: "DY",
    dividend_payout: "DPR", free_cash_flow_yield: "FCFY", debt_assets: "D/A",
    asset_turnover: "AT", inventory_turnover: "IT", ebitda_margin: "EM",
    net_debt_ebitda: "ND/E", operating_cash_flow_margin: "OCFM",
  });

  const bankCodes = Object.freeze({
    pe: "P/E", pb: "P/B", dividend_yield: "DY", dividend_payout: "DPR", nim: "NIM",
    cost_income: "C/I", loan_deposit: "LDR", npl: "NPL", npl_coverage: "NPLC",
    capital_adequacy: "CAR",
  });

  function normalizeAdvancedDefinition(item) {
    const valuationCodes = new Set(["market_cap", "pe", "pb", "ps", "p_fcf", "ev_ebitda", "ev_sales", "peg", "dividend_yield", "dividend_payout", "free_cash_flow_yield"]);
    return {
      code: operatingCodes[item.code] || item.code,
      label: item.label,
      group: valuationCodes.has(item.code) ? "valuation" : "efficiency",
      formula: item.formula,
      description: item.description,
    };
  }

  function normalizeBankDefinition(item) {
    const returnCodes = new Set(["pe", "pb", "dividend_yield", "dividend_payout"]);
    const riskCodes = new Set(["npl", "npl_coverage", "capital_adequacy"]);
    return {
      code: bankCodes[item.code] || item.code,
      label: item.label,
      group: returnCodes.has(item.code) ? "returns" : riskCodes.has(item.code) ? "risk" : "banking",
      formula: item.formula,
      description: item.description,
    };
  }

  function createRatioCard(item) {
    const card = document.createElement("article");
    card.className = "ratio-guide-card guide-service-card";

    const head = document.createElement("div");
    head.className = "ratio-card-head";
    const code = document.createElement("span");
    code.className = "ratio-code";
    code.textContent = item.code;
    const titleWrap = document.createElement("div");
    const caption = document.createElement("small");
    caption.textContent = "مؤشر مالي";
    const title = document.createElement("h3");
    title.textContent = item.label;
    titleWrap.append(caption, title);
    head.append(code, titleWrap);

    const description = document.createElement("p");
    description.className = "ratio-definition";
    description.textContent = item.description;
    const formula = document.createElement("div");
    formula.className = "formula-box";
    const formulaLabel = document.createElement("span");
    formulaLabel.textContent = "طريقة الحساب";
    const formulaValue = document.createElement("strong");
    formulaValue.textContent = item.formula;
    formula.append(formulaLabel, formulaValue);
    card.append(head, description, formula);
    return card;
  }

  function createGroup(group, items) {
    const section = document.createElement("section");
    section.className = "ratio-group guide-service-group";
    const heading = document.createElement("div");
    heading.className = "ratio-group-heading";
    const number = document.createElement("span");
    number.className = "group-number";
    number.textContent = group.number;
    const titleWrap = document.createElement("div");
    const kicker = document.createElement("span");
    kicker.textContent = group.kicker;
    const title = document.createElement("h2");
    title.textContent = group.title;
    titleWrap.append(kicker, title);
    heading.append(number, titleWrap);
    const grid = document.createElement("div");
    grid.className = "ratio-guide-grid";
    items.forEach((item) => grid.append(createRatioCard(item)));
    section.append(heading, grid);
    return section;
  }

  function setActiveButton(mode) {
    modeButtons.forEach((button) => {
      const active = button.dataset.guideMode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function render(mode) {
    const bankMode = mode === "bank";
    const definitions = bankMode
      ? [...bankCore, ...bankApi.definitions.map(normalizeBankDefinition)]
      : [...operatingCore, ...advancedApi.definitions.map(normalizeAdvancedDefinition)];
    const groups = bankMode ? bankGroups : operatingGroups;
    container.replaceChildren();
    groups.forEach((group) => {
      const items = definitions.filter((item) => item.group === group.id);
      if (items.length) container.append(createGroup(group, items));
    });
    setActiveButton(bankMode ? "bank" : "operating");
  }

  modeButtons.forEach((button) => button.addEventListener("click", () => render(button.dataset.guideMode)));
  document.querySelector("#companyType")?.addEventListener("change", (event) => {
    if (event.target.value === "bank") render("bank");
    if (event.target.value === "operating") render("operating");
  });
  render("operating");
})();
