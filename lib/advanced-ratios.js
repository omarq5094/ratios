(function registerAdvancedFinancialRatios(globalObject) {
  const fieldLabels = Object.freeze({
    marketCap: "القيمة السوقية",
    freeCashFlow: "التدفق النقدي الحر",
    enterpriseValue: "قيمة المنشأة",
    ebitda: "الأرباح قبل الفوائد والضرائب والاستهلاك والإطفاء",
    cashAndEquivalents: "النقد وما في حكمه",
    previousInventory: "مخزون السنة السابقة",
    annualDividendPerShare: "التوزيعات السنوية للسهم",
    sharePrice: "سعر السهم",
    totalDividends: "إجمالي توزيعات الأرباح",
    earningsGrowthPercent: "معدل نمو الأرباح",
    interestExpense: "مصروف التمويل",
  });

  const inputMeta = Object.freeze({
    marketCap: { unit: "currency", min: 0 },
    freeCashFlow: { unit: "currency" },
    enterpriseValue: { unit: "currency" },
    ebitda: { unit: "currency" },
    cashAndEquivalents: { unit: "currency", min: 0 },
    previousInventory: { unit: "currency", min: 0 },
    annualDividendPerShare: { unit: "currency_per_share", min: 0 },
    sharePrice: { unit: "currency_per_share", min: 0 },
    totalDividends: { unit: "currency", min: 0 },
    earningsGrowthPercent: { unit: "percent" },
    interestExpense: { unit: "currency", min: 0 },
  });

  const definitions = Object.freeze([
    {
      code: "market_cap",
      label: "القيمة السوقية",
      english: "Market Cap",
      type: "currency",
      group: "valuation",
      formula: "سعر السهم × عدد الأسهم المتداولة",
      description: "القيمة الإجمالية للأسهم المتداولة في السوق.",
    },
    {
      code: "pe",
      label: "مضاعف الربحية",
      english: "Price / Earnings (P/E)",
      type: "multiple",
      group: "valuation",
      formula: "سعر السهم ÷ ربحية السهم",
      description: "ما يدفعه السوق مقابل كل ريال من صافي الربح.",
      negativeDescription: "النتيجة سالبة لأن الشركة سجلت صافي خسارة.",
    },
    {
      code: "pb",
      label: "السعر إلى القيمة الدفترية",
      english: "Price / Book (P/B)",
      type: "multiple",
      group: "valuation",
      formula: "سعر السهم ÷ القيمة الدفترية للسهم",
      description: "القيمة السوقية مقارنة بحقوق المساهمين.",
      negativeDescription: "النتيجة سالبة لأن حقوق الملكية المستخدمة في الحساب سالبة.",
    },
    {
      code: "ps",
      label: "السعر إلى المبيعات",
      english: "Price / Sales (P/S)",
      type: "multiple",
      group: "valuation",
      formula: "سعر السهم ÷ المبيعات لكل سهم",
      description: "ما يدفعه السوق مقابل كل ريال من الإيرادات.",
    },
    {
      code: "p_fcf",
      label: "السعر إلى التدفق النقدي الحر",
      english: "Price / Free Cash Flow (P/FCF)",
      type: "multiple",
      group: "valuation",
      formula: "سعر السهم ÷ التدفق النقدي الحر لكل سهم",
      description: "القيمة السوقية مقارنة بالنقد الحر الذي تولده الشركة.",
      negativeDescription: "النتيجة سالبة لأن التدفق النقدي الحر المستخدم في الحساب سالب.",
    },
    {
      code: "ev_ebitda",
      label: "قيمة المنشأة إلى EBITDA",
      english: "EV / EBITDA",
      type: "multiple",
      group: "valuation",
      formula: "قيمة المنشأة ÷ EBITDA",
      description: "تقييم المنشأة دون أثر اختلاف هيكل التمويل.",
      negativeDescription: "النتيجة سالبة بسبب قيمة منشأة سالبة أو EBITDA سالبة.",
    },
    {
      code: "ev_sales",
      label: "قيمة المنشأة إلى المبيعات",
      english: "EV / Sales",
      type: "multiple",
      group: "valuation",
      formula: "قيمة المنشأة ÷ الإيرادات",
      description: "قيمة المنشأة مقارنة بإيراداتها السنوية.",
    },
    {
      code: "peg",
      label: "مضاعف الربحية إلى النمو",
      english: "PEG Ratio",
      type: "multiple",
      group: "valuation",
      formula: "مضاعف الربحية ÷ معدل نمو الأرباح",
      description: "مضاعف الربحية مقارنة بمعدل نمو الأرباح.",
      negativeDescription: "النتيجة سالبة لأن مضاعف الربحية أو معدل النمو المستخدم في الحساب سالب.",
    },
    {
      code: "dividend_yield",
      label: "عائد التوزيعات",
      english: "Dividend Yield",
      type: "percent",
      group: "valuation",
      formula: "التوزيعات السنوية للسهم ÷ سعر السهم × 100",
      description: "التوزيعات السنوية للسهم مقارنة بسعره.",
    },
    {
      code: "dividend_payout",
      label: "نسبة توزيع الأرباح",
      english: "Dividend Payout Ratio",
      type: "percent",
      group: "valuation",
      formula: "إجمالي توزيعات الأرباح ÷ صافي الربح × 100",
      description: "الجزء الموزع على المساهمين من صافي الربح.",
      negativeDescription: "النتيجة سالبة لأن صافي الربح المستخدم في الحساب سالب.",
    },
    {
      code: "free_cash_flow_yield",
      label: "عائد التدفق النقدي الحر",
      english: "Free Cash Flow Yield",
      type: "percent",
      group: "valuation",
      formula: "التدفق النقدي الحر ÷ القيمة السوقية × 100",
      description: "التدفق النقدي الحر مقارنة بالقيمة السوقية.",
      negativeDescription: "النتيجة سالبة لأن التدفق النقدي الحر المستخدم في الحساب سالب.",
    },
    {
      code: "debt_assets",
      label: "الديون إلى الأصول",
      english: "Debt / Assets",
      type: "percent",
      group: "operations",
      formula: "إجمالي الديون ÷ إجمالي الأصول × 100",
      description: "نسبة إجمالي الأصول الممولة بالديون.",
    },
    {
      code: "asset_turnover",
      label: "دوران الأصول",
      english: "Asset Turnover",
      type: "multiple",
      group: "operations",
      formula: "الإيرادات ÷ إجمالي الأصول",
      description: "كفاءة الأصول في توليد الإيرادات.",
    },
    {
      code: "inventory_turnover",
      label: "دوران المخزون",
      english: "Inventory Turnover",
      type: "multiple",
      group: "operations",
      formula: "تكلفة المبيعات ÷ متوسط المخزون",
      description: "سرعة بيع المخزون واستبداله خلال السنة.",
    },
    {
      code: "ebitda_margin",
      label: "هامش EBITDA",
      english: "EBITDA Margin",
      type: "percent",
      group: "operations",
      formula: "EBITDA ÷ الإيرادات × 100",
      description: "الربحية قبل التمويل والضرائب والاستهلاك والإطفاء.",
      negativeDescription: "النتيجة سالبة لأن EBITDA المستخدمة في الحساب سالبة.",
    },
    {
      code: "net_debt_ebitda",
      label: "صافي الدين إلى EBITDA",
      english: "Net Debt / EBITDA",
      type: "multiple",
      group: "operations",
      formula: "(إجمالي الديون − النقد) ÷ EBITDA",
      description: "عبء صافي الدين مقارنة بالأرباح التشغيلية التقريبية.",
      negativeDescription: "قد تعكس النتيجة السالبة صافي نقد أو EBITDA سالبة.",
    },
    {
      code: "operating_cash_flow_margin",
      label: "هامش التدفق النقدي التشغيلي",
      english: "Operating Cash Flow Margin",
      type: "percent",
      group: "operations",
      formula: "التدفق النقدي التشغيلي ÷ الإيرادات × 100",
      description: "النقد التشغيلي المتولد من كل ريال إيرادات.",
      negativeDescription: "النتيجة سالبة لأن التدفق النقدي التشغيلي المستخدم في الحساب سالب.",
    },
  ]);

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function unique(values) {
    return [...new Set(values)];
  }

  function createResult(code, value, missingFields = [], invalidReason = "") {
    const missing = unique(missingFields);
    if (missing.length) return { code, value: null, status: "missing", missingFields: missing, invalidReason: "" };
    if (invalidReason) return { code, value: null, status: "invalid", missingFields: [], invalidReason };
    return { code, value, status: "available", missingFields: [], invalidReason: "" };
  }

  function missingFor(values, keys) {
    return keys.filter((key) => !finite(values[key]));
  }

  function calculate(values) {
    const marketCap = finite(values.marketCap) ? values.marketCap : null;
    const enterpriseValue = finite(values.enterpriseValue)
      ? values.enterpriseValue
      : finite(marketCap) && finite(values.totalDebt) && finite(values.cashAndEquivalents)
        ? marketCap + values.totalDebt - values.cashAndEquivalents
        : null;
    const enterpriseMissing = finite(enterpriseValue) ? [] : ["enterpriseValue"];
    const results = {};

    results.market_cap = createResult(
      "market_cap",
      marketCap,
      finite(marketCap) ? [] : ["marketCap"],
    );

    const peMissing = missingFor({ marketCap, netProfit: values.netProfit }, ["marketCap", "netProfit"]);
    results.pe = createResult(
      "pe",
      peMissing.length || values.netProfit === 0 ? null : marketCap / values.netProfit,
      peMissing,
      !peMissing.length && values.netProfit === 0 ? "لا يمكن الحساب لأن صافي الربح يساوي صفرًا." : "",
    );

    const pbMissing = missingFor({ marketCap, equity: values.equity }, ["marketCap", "equity"]);
    results.pb = createResult(
      "pb",
      pbMissing.length || values.equity === 0 ? null : marketCap / values.equity,
      pbMissing,
      !pbMissing.length && values.equity === 0 ? "لا يمكن الحساب لأن حقوق الملكية تساوي صفرًا." : "",
    );

    const psMissing = missingFor({ marketCap, revenue: values.revenue }, ["marketCap", "revenue"]);
    results.ps = createResult(
      "ps",
      psMissing.length || values.revenue === 0 ? null : marketCap / values.revenue,
      psMissing,
      !psMissing.length && values.revenue === 0 ? "لا يمكن الحساب لأن الإيرادات تساوي صفرًا." : "",
    );

    const pFcfMissing = missingFor(
      { marketCap, freeCashFlow: values.freeCashFlow },
      ["marketCap", "freeCashFlow"],
    );
    results.p_fcf = createResult(
      "p_fcf",
      pFcfMissing.length || values.freeCashFlow === 0
        ? null
        : marketCap / values.freeCashFlow,
      pFcfMissing,
      !pFcfMissing.length && values.freeCashFlow === 0
        ? "لا يمكن الحساب لأن التدفق النقدي الحر يساوي صفرًا."
        : "",
    );

    const evEbitdaMissing = unique([
      ...enterpriseMissing,
      ...missingFor(values, ["ebitda"]),
    ]);
    results.ev_ebitda = createResult(
      "ev_ebitda",
      evEbitdaMissing.length || values.ebitda === 0 ? null : enterpriseValue / values.ebitda,
      evEbitdaMissing,
      !evEbitdaMissing.length && values.ebitda === 0
        ? "لا يمكن الحساب لأن EBITDA تساوي صفرًا."
        : "",
    );

    const evSalesMissing = unique([
      ...enterpriseMissing,
      ...missingFor(values, ["revenue"]),
    ]);
    results.ev_sales = createResult(
      "ev_sales",
      evSalesMissing.length || values.revenue === 0 ? null : enterpriseValue / values.revenue,
      evSalesMissing,
      !evSalesMissing.length && values.revenue === 0 ? "لا يمكن الحساب لأن الإيرادات تساوي صفرًا." : "",
    );

    const pegMissing = unique([
      ...results.pe.missingFields,
      ...missingFor(values, ["earningsGrowthPercent"]),
    ]);
    const pegInvalid = results.pe.status === "invalid"
      ? "لا يمكن حساب PEG لأن مضاعف الربحية غير قابل للحساب."
      : !pegMissing.length && values.earningsGrowthPercent === 0
        ? "لا يمكن الحساب لأن معدل نمو الأرباح يساوي صفرًا."
        : "";
    results.peg = createResult(
      "peg",
      pegMissing.length || pegInvalid ? null : results.pe.value / values.earningsGrowthPercent,
      pegMissing,
      pegInvalid,
    );

    const dividendYieldMissing = missingFor(values, ["annualDividendPerShare", "sharePrice"]);
    results.dividend_yield = createResult(
      "dividend_yield",
      dividendYieldMissing.length || values.sharePrice === 0
        ? null
        : values.annualDividendPerShare / values.sharePrice,
      dividendYieldMissing,
      !dividendYieldMissing.length && values.sharePrice === 0 ? "لا يمكن الحساب لأن سعر السهم يساوي صفرًا." : "",
    );

    const payoutMissing = missingFor(values, ["totalDividends", "netProfit"]);
    results.dividend_payout = createResult(
      "dividend_payout",
      payoutMissing.length || values.netProfit === 0 ? null : values.totalDividends / values.netProfit,
      payoutMissing,
      !payoutMissing.length && values.netProfit === 0
        ? "لا يمكن الحساب لأن صافي الربح يساوي صفرًا."
        : "",
    );

    const fcfYieldMissing = missingFor(
      { freeCashFlow: values.freeCashFlow, marketCap },
      ["freeCashFlow", "marketCap"],
    );
    results.free_cash_flow_yield = createResult(
      "free_cash_flow_yield",
      fcfYieldMissing.length || marketCap === 0 ? null : values.freeCashFlow / marketCap,
      fcfYieldMissing,
      !fcfYieldMissing.length && marketCap === 0 ? "لا يمكن الحساب لأن القيمة السوقية تساوي صفرًا." : "",
    );

    const debtAssetsMissing = missingFor(values, ["totalDebt", "totalAssets"]);
    results.debt_assets = createResult(
      "debt_assets",
      debtAssetsMissing.length || values.totalAssets === 0 ? null : values.totalDebt / values.totalAssets,
      debtAssetsMissing,
      !debtAssetsMissing.length && values.totalAssets === 0 ? "لا يمكن الحساب لأن إجمالي الأصول يساوي صفرًا." : "",
    );

    const assetTurnoverMissing = missingFor(values, ["revenue", "totalAssets"]);
    results.asset_turnover = createResult(
      "asset_turnover",
      assetTurnoverMissing.length || values.totalAssets === 0 ? null : values.revenue / values.totalAssets,
      assetTurnoverMissing,
      !assetTurnoverMissing.length && values.totalAssets === 0 ? "لا يمكن الحساب لأن إجمالي الأصول يساوي صفرًا." : "",
    );

    const inventoryMissing = missingFor(values, ["costOfSales", "inventory", "previousInventory"]);
    const averageInventory = inventoryMissing.length ? null : (values.inventory + values.previousInventory) / 2;
    results.inventory_turnover = createResult(
      "inventory_turnover",
      inventoryMissing.length || averageInventory === 0 ? null : values.costOfSales / averageInventory,
      inventoryMissing,
      !inventoryMissing.length && averageInventory === 0 ? "لا يمكن الحساب لأن متوسط المخزون يساوي صفرًا." : "",
    );

    const ebitdaMarginMissing = missingFor(values, ["ebitda", "revenue"]);
    results.ebitda_margin = createResult(
      "ebitda_margin",
      ebitdaMarginMissing.length || values.revenue === 0 ? null : values.ebitda / values.revenue,
      ebitdaMarginMissing,
      !ebitdaMarginMissing.length && values.revenue === 0 ? "لا يمكن الحساب لأن الإيرادات تساوي صفرًا." : "",
    );

    const netDebtMissing = missingFor(values, ["totalDebt", "cashAndEquivalents", "ebitda"]);
    results.net_debt_ebitda = createResult(
      "net_debt_ebitda",
      netDebtMissing.length || values.ebitda === 0
        ? null
        : (values.totalDebt - values.cashAndEquivalents) / values.ebitda,
      netDebtMissing,
      !netDebtMissing.length && values.ebitda === 0
        ? "لا يمكن الحساب لأن EBITDA تساوي صفرًا."
        : "",
    );

    const ocfMarginMissing = missingFor(values, ["operatingCashFlow", "revenue"]);
    results.operating_cash_flow_margin = createResult(
      "operating_cash_flow_margin",
      ocfMarginMissing.length || values.revenue === 0 ? null : values.operatingCashFlow / values.revenue,
      ocfMarginMissing,
      !ocfMarginMissing.length && values.revenue === 0 ? "لا يمكن الحساب لأن الإيرادات تساوي صفرًا." : "",
    );

    return definitions.map((definition) => ({
      ...definition,
      ...results[definition.code],
    }));
  }

  globalObject.AdvancedFinancialRatios = Object.freeze({
    calculate,
    definitions,
    fieldLabels,
    inputMeta,
  });
})(globalThis);
