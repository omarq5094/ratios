(function registerBankFinancialRatios(globalObject) {
  const fieldLabels = Object.freeze({
    marketCap: "القيمة السوقية",
    netProfit: "صافي الربح",
    equity: "حقوق الملكية",
    previousEquity: "حقوق السنة السابقة",
    totalAssets: "إجمالي الأصول",
    previousAssets: "أصول السنة السابقة",
    annualDividendPerShare: "التوزيعات السنوية للسهم",
    sharePrice: "سعر السهم",
    totalDividends: "إجمالي توزيعات الأرباح",
    netInterestIncome: "صافي دخل العمولات الخاصة",
    averageEarningAssets: "متوسط الأصول المدرة للدخل",
    operatingExpenses: "المصروفات التشغيلية",
    operatingIncome: "الدخل التشغيلي",
    totalLoans: "إجمالي القروض والسلف",
    customerDeposits: "ودائع العملاء",
    nonPerformingLoans: "القروض غير العاملة",
    loanLossProvisions: "مخصصات خسائر الائتمان",
    regulatoryCapital: "رأس المال التنظيمي",
    riskWeightedAssets: "الأصول المرجحة بالمخاطر",
  });

  const inputMeta = Object.freeze(Object.fromEntries(
    Object.keys(fieldLabels).map((key) => [
      key,
      {
        unit: key === "annualDividendPerShare" || key === "sharePrice" ? "currency_per_share" : "currency",
        min: key === "netProfit" ? undefined : 0,
      },
    ]),
  ));

  const definitions = Object.freeze([
    {
      code: "pe",
      label: "مضاعف الربحية",
      english: "Price / Earnings (P/E)",
      type: "multiple",
      group: "valuation",
      fields: ["marketCap", "netProfit"],
      formula: "القيمة السوقية ÷ صافي الربح",
      description: "ما يدفعه السوق مقابل كل ريال من صافي ربح البنك.",
    },
    {
      code: "pb",
      label: "السعر إلى القيمة الدفترية",
      english: "Price / Book (P/B)",
      type: "multiple",
      group: "valuation",
      fields: ["marketCap", "equity"],
      formula: "القيمة السوقية ÷ حقوق الملكية",
      description: "تقييم البنك مقارنة بحقوق مساهميه.",
    },
    {
      code: "dividend_yield",
      label: "عائد التوزيعات",
      english: "Dividend Yield",
      type: "percent",
      group: "valuation",
      fields: ["annualDividendPerShare", "sharePrice"],
      formula: "التوزيعات السنوية للسهم ÷ سعر السهم × 100",
      description: "العائد النقدي السنوي مقارنة بسعر السهم.",
    },
    {
      code: "dividend_payout",
      label: "نسبة توزيع الأرباح",
      english: "Dividend Payout Ratio",
      type: "percent",
      group: "valuation",
      fields: ["totalDividends", "netProfit"],
      formula: "إجمالي التوزيعات ÷ صافي الربح × 100",
      description: "الجزء الموزع على المساهمين من صافي ربح البنك.",
    },
    {
      code: "nim",
      label: "هامش صافي العمولات الخاصة",
      english: "Net Interest Margin (NIM)",
      type: "percent",
      group: "banking",
      fields: ["netInterestIncome", "averageEarningAssets"],
      formula: "صافي دخل العمولات الخاصة ÷ متوسط الأصول المدرة للدخل × 100",
      description: "كفاءة البنك في توليد دخل تمويلي من أصوله المدرة للدخل.",
    },
    {
      code: "cost_income",
      label: "التكلفة إلى الدخل",
      english: "Cost-to-Income Ratio",
      type: "percent",
      group: "banking",
      fields: ["operatingExpenses", "operatingIncome"],
      formula: "المصروفات التشغيلية ÷ الدخل التشغيلي × 100",
      description: "يقيس كفاءة البنك التشغيلية؛ انخفاضه يعني تكلفة أقل لكل ريال دخل.",
    },
    {
      code: "loan_deposit",
      label: "القروض إلى الودائع",
      english: "Loan-to-Deposit Ratio (LDR)",
      type: "percent",
      group: "banking",
      fields: ["totalLoans", "customerDeposits"],
      formula: "إجمالي القروض والسلف ÷ ودائع العملاء × 100",
      description: "يوضح مدى توظيف ودائع العملاء في محفظة التمويل.",
    },
    {
      code: "npl",
      label: "القروض غير العاملة",
      english: "Non-Performing Loans (NPL)",
      type: "percent",
      group: "banking",
      fields: ["nonPerformingLoans", "totalLoans"],
      formula: "القروض غير العاملة ÷ إجمالي القروض والسلف × 100",
      description: "يقيس جودة المحفظة الائتمانية ونسبة التعثر فيها.",
    },
    {
      code: "npl_coverage",
      label: "تغطية القروض غير العاملة",
      english: "NPL Coverage Ratio",
      type: "percent",
      group: "banking",
      fields: ["loanLossProvisions", "nonPerformingLoans"],
      formula: "مخصصات خسائر الائتمان ÷ القروض غير العاملة × 100",
      description: "مدى تغطية المخصصات للقروض غير العاملة.",
    },
    {
      code: "capital_adequacy",
      label: "كفاية رأس المال",
      english: "Capital Adequacy Ratio (CAR)",
      type: "percent",
      group: "banking",
      fields: ["regulatoryCapital", "riskWeightedAssets"],
      formula: "رأس المال التنظيمي ÷ الأصول المرجحة بالمخاطر × 100",
      description: "قدرة رأس المال التنظيمي على استيعاب المخاطر المرجحة.",
    },
  ]);

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function calculate(values) {
    return definitions.map((definition) => {
      const missingFields = definition.fields.filter((key) => !finite(values[key]));
      if (missingFields.length) {
        return { ...definition, value: null, status: "missing", missingFields, invalidReason: "" };
      }

      const [numeratorKey, denominatorKey] = definition.fields;
      const denominator = values[denominatorKey];
      if (denominator === 0) {
        return {
          ...definition,
          value: null,
          status: "invalid",
          missingFields: [],
          invalidReason: `لا يمكن الحساب لأن ${fieldLabels[denominatorKey]} يساوي صفرًا.`,
        };
      }

      return {
        ...definition,
        value: values[numeratorKey] / denominator,
        status: "available",
        missingFields: [],
        invalidReason: "",
      };
    });
  }

  globalObject.BankFinancialRatios = Object.freeze({
    calculate,
    definitions,
    fieldLabels,
    inputMeta,
  });
})(globalThis);
