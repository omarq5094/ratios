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
      description: "القيمة الإجمالية للأسهم المتداولة في السوق.",
    },
    {
      code: "pe",
      label: "مضاعف الربحية",
      english: "Price / Earnings (P/E)",
      type: "multiple",
      group: "valuation",
      description: "ما يدفعه السوق مقابل كل ريال من صافي الربح.",
    },
    {
      code: "pb",
      label: "السعر إلى القيمة الدفترية",
      english: "Price / Book (P/B)",
      type: "multiple",
      group: "valuation",
      description: "القيمة السوقية مقارنة بحقوق المساهمين.",
    },
    {
      code: "ps",
      label: "السعر إلى المبيعات",
      english: "Price / Sales (P/S)",
      type: "multiple",
      group: "valuation",
      description: "ما يدفعه السوق مقابل كل ريال من الإيرادات.",
    },
    {
      code: "p_fcf",
      label: "السعر إلى التدفق النقدي الحر",
      english: "Price / Free Cash Flow (P/FCF)",
      type: "multiple",
      group: "valuation",
      description: "القيمة السوقية مقارنة بالنقد الحر الذي تولده الشركة.",
    },
    {
      code: "ev_ebitda",
      label: "قيمة المنشأة إلى EBITDA",
      english: "EV / EBITDA",
      type: "multiple",
      group: "valuation",
      description: "تقييم المنشأة دون أثر اختلاف هيكل التمويل.",
    },
    {
      code: "ev_sales",
      label: "قيمة المنشأة إلى المبيعات",
      english: "EV / Sales",
      type: "multiple",
      group: "valuation",
      description: "قيمة المنشأة مقارنة بإيراداتها السنوية.",
    },
    {
      code: "peg",
      label: "مضاعف الربحية إلى النمو",
      english: "PEG Ratio",
      type: "multiple",
      group: "valuation",
      description: "مضاعف الربحية مقارنة بمعدل نمو الأرباح.",
    },
    {
      code: "dividend_yield",
      label: "عائد التوزيعات",
      english: "Dividend Yield",
      type: "percent",
      group: "valuation",
      description: "التوزيعات السنوية للسهم مقارنة بسعره.",
    },
    {
      code: "dividend_payout",
      label: "نسبة توزيع الأرباح",
      english: "Dividend Payout Ratio",
      type: "percent",
      group: "valuation",
      description: "الجزء الموزع على المساهمين من صافي الربح.",
    },
    {
      code: "free_cash_flow_yield",
      label: "عائد التدفق النقدي الحر",
      english: "Free Cash Flow Yield",
      type: "percent",
      group: "valuation",
      description: "التدفق النقدي الحر مقارنة بالقيمة السوقية.",
    },
    {
      code: "debt_assets",
      label: "الديون إلى الأصول",
      english: "Debt / Assets",
      type: "percent",
      group: "operations",
      description: "نسبة إجمالي الأصول الممولة بالديون.",
    },
    {
      code: "asset_turnover",
      label: "دوران الأصول",
      english: "Asset Turnover",
      type: "multiple",
      group: "operations",
      description: "كفاءة الأصول في توليد الإيرادات.",
    },
    {
      code: "inventory_turnover",
      label: "دوران المخزون",
      english: "Inventory Turnover",
      type: "multiple",
      group: "operations",
      description: "سرعة بيع المخزون واستبداله خلال السنة.",
    },
    {
      code: "ebitda_margin",
      label: "هامش EBITDA",
      english: "EBITDA Margin",
      type: "percent",
      group: "operations",
      description: "الربحية قبل التمويل والضرائب والاستهلاك والإطفاء.",
    },
    {
      code: "net_debt_ebitda",
      label: "صافي الدين إلى EBITDA",
      english: "Net Debt / EBITDA",
      type: "multiple",
      group: "operations",
      description: "عبء صافي الدين مقارنة بالأرباح التشغيلية التقريبية.",
    },
    {
      code: "operating_cash_flow_margin",
      label: "هامش التدفق النقدي التشغيلي",
      english: "Operating Cash Flow Margin",
      type: "percent",
      group: "operations",
      description: "النقد التشغيلي المتولد من كل ريال إيرادات.",
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
      finite(marketCap) && marketCap <= 0 ? "القيمة السوقية يجب أن تكون أكبر من صفر." : "",
    );

    const peMissing = missingFor({ marketCap, netProfit: values.netProfit }, ["marketCap", "netProfit"]);
    results.pe = createResult(
      "pe",
      peMissing.length || marketCap <= 0 || values.netProfit <= 0 ? null : marketCap / values.netProfit,
      peMissing,
      !peMissing.length && marketCap <= 0
        ? "القيمة السوقية يجب أن تكون أكبر من صفر."
        : !peMissing.length && values.netProfit <= 0
          ? "غير قابل للتفسير بسبب صافي خسارة أو انعدام الربح."
          : "",
    );

    const pbMissing = missingFor({ marketCap, equity: values.equity }, ["marketCap", "equity"]);
    results.pb = createResult(
      "pb",
      pbMissing.length || marketCap <= 0 || values.equity <= 0 ? null : marketCap / values.equity,
      pbMissing,
      !pbMissing.length && marketCap <= 0
        ? "القيمة السوقية يجب أن تكون أكبر من صفر."
        : !pbMissing.length && values.equity <= 0
          ? "غير قابل للتفسير عندما تكون حقوق الملكية صفرًا أو سالبة."
          : "",
    );

    const psMissing = missingFor({ marketCap, revenue: values.revenue }, ["marketCap", "revenue"]);
    results.ps = createResult(
      "ps",
      psMissing.length || marketCap <= 0 || values.revenue <= 0 ? null : marketCap / values.revenue,
      psMissing,
      !psMissing.length && marketCap <= 0
        ? "القيمة السوقية يجب أن تكون أكبر من صفر."
        : !psMissing.length && values.revenue <= 0
          ? "الإيرادات يجب أن تكون أكبر من صفر."
          : "",
    );

    const pFcfMissing = missingFor(
      { marketCap, freeCashFlow: values.freeCashFlow },
      ["marketCap", "freeCashFlow"],
    );
    results.p_fcf = createResult(
      "p_fcf",
      pFcfMissing.length || marketCap <= 0 || values.freeCashFlow <= 0
        ? null
        : marketCap / values.freeCashFlow,
      pFcfMissing,
      !pFcfMissing.length && marketCap <= 0
        ? "القيمة السوقية يجب أن تكون أكبر من صفر."
        : !pFcfMissing.length && values.freeCashFlow <= 0
          ? "غير قابل للتفسير عندما يكون التدفق النقدي الحر صفرًا أو سالبًا."
          : "",
    );

    const evEbitdaMissing = unique([
      ...enterpriseMissing,
      ...missingFor(values, ["ebitda"]),
    ]);
    results.ev_ebitda = createResult(
      "ev_ebitda",
      evEbitdaMissing.length || values.ebitda <= 0 ? null : enterpriseValue / values.ebitda,
      evEbitdaMissing,
      !evEbitdaMissing.length && values.ebitda <= 0
        ? "غير قابل للتفسير عندما تكون EBITDA صفرًا أو سالبة."
        : "",
    );

    const evSalesMissing = unique([
      ...enterpriseMissing,
      ...missingFor(values, ["revenue"]),
    ]);
    results.ev_sales = createResult(
      "ev_sales",
      evSalesMissing.length || values.revenue <= 0 ? null : enterpriseValue / values.revenue,
      evSalesMissing,
      !evSalesMissing.length && values.revenue <= 0 ? "الإيرادات يجب أن تكون أكبر من صفر." : "",
    );

    const pegMissing = unique([
      ...results.pe.missingFields,
      ...missingFor(values, ["earningsGrowthPercent"]),
    ]);
    const pegInvalid =
      results.pe.status === "invalid"
        ? "لا يمكن حساب PEG لأن مضاعف الربحية غير قابل للتفسير."
        : !pegMissing.length && values.earningsGrowthPercent <= 0
          ? "غير قابل للتفسير عندما يكون نمو الأرباح صفرًا أو سالبًا."
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
      dividendYieldMissing.length || values.sharePrice <= 0
        ? null
        : values.annualDividendPerShare / values.sharePrice,
      dividendYieldMissing,
      !dividendYieldMissing.length && values.sharePrice <= 0 ? "سعر السهم يجب أن يكون أكبر من صفر." : "",
    );

    const payoutMissing = missingFor(values, ["totalDividends", "netProfit"]);
    results.dividend_payout = createResult(
      "dividend_payout",
      payoutMissing.length || values.netProfit <= 0 ? null : values.totalDividends / values.netProfit,
      payoutMissing,
      !payoutMissing.length && values.netProfit <= 0
        ? "غير قابل للتفسير بسبب صافي خسارة أو انعدام الربح."
        : "",
    );

    const fcfYieldMissing = missingFor(
      { freeCashFlow: values.freeCashFlow, marketCap },
      ["freeCashFlow", "marketCap"],
    );
    results.free_cash_flow_yield = createResult(
      "free_cash_flow_yield",
      fcfYieldMissing.length || marketCap <= 0 ? null : values.freeCashFlow / marketCap,
      fcfYieldMissing,
      !fcfYieldMissing.length && marketCap <= 0 ? "القيمة السوقية يجب أن تكون أكبر من صفر." : "",
    );

    const debtAssetsMissing = missingFor(values, ["totalDebt", "totalAssets"]);
    results.debt_assets = createResult(
      "debt_assets",
      debtAssetsMissing.length || values.totalAssets <= 0 ? null : values.totalDebt / values.totalAssets,
      debtAssetsMissing,
      !debtAssetsMissing.length && values.totalAssets <= 0 ? "إجمالي الأصول يجب أن يكون أكبر من صفر." : "",
    );

    const assetTurnoverMissing = missingFor(values, ["revenue", "totalAssets"]);
    results.asset_turnover = createResult(
      "asset_turnover",
      assetTurnoverMissing.length || values.totalAssets <= 0 ? null : values.revenue / values.totalAssets,
      assetTurnoverMissing,
      !assetTurnoverMissing.length && values.totalAssets <= 0 ? "إجمالي الأصول يجب أن يكون أكبر من صفر." : "",
    );

    const inventoryMissing = missingFor(values, ["costOfSales", "inventory", "previousInventory"]);
    const averageInventory = inventoryMissing.length ? null : (values.inventory + values.previousInventory) / 2;
    results.inventory_turnover = createResult(
      "inventory_turnover",
      inventoryMissing.length || averageInventory <= 0 ? null : values.costOfSales / averageInventory,
      inventoryMissing,
      !inventoryMissing.length && averageInventory <= 0 ? "متوسط المخزون يجب أن يكون أكبر من صفر." : "",
    );

    const ebitdaMarginMissing = missingFor(values, ["ebitda", "revenue"]);
    results.ebitda_margin = createResult(
      "ebitda_margin",
      ebitdaMarginMissing.length || values.revenue <= 0 ? null : values.ebitda / values.revenue,
      ebitdaMarginMissing,
      !ebitdaMarginMissing.length && values.revenue <= 0 ? "الإيرادات يجب أن تكون أكبر من صفر." : "",
    );

    const netDebtMissing = missingFor(values, ["totalDebt", "cashAndEquivalents", "ebitda"]);
    results.net_debt_ebitda = createResult(
      "net_debt_ebitda",
      netDebtMissing.length || values.ebitda <= 0
        ? null
        : (values.totalDebt - values.cashAndEquivalents) / values.ebitda,
      netDebtMissing,
      !netDebtMissing.length && values.ebitda <= 0
        ? "غير قابل للتفسير عندما تكون EBITDA صفرًا أو سالبة."
        : "",
    );

    const ocfMarginMissing = missingFor(values, ["operatingCashFlow", "revenue"]);
    results.operating_cash_flow_margin = createResult(
      "operating_cash_flow_margin",
      ocfMarginMissing.length || values.revenue <= 0 ? null : values.operatingCashFlow / values.revenue,
      ocfMarginMissing,
      !ocfMarginMissing.length && values.revenue <= 0 ? "الإيرادات يجب أن تكون أكبر من صفر." : "",
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
