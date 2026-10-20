// Fictional teaching examples prepared for the platform; not user records.
export const INVENTORY_EXAMPLES = {
  simple: {
    title: "مثال 1: سبع عمليات",
    lesson: "في هذا المثال تأتي ثلاث مشتريات بأسعار متزايدة قبل أول بيع. تتبع FIFO الدفعات الأقدم، وLIFO الأحدث للتعليم فقط، بينما يستخدم المتوسط المتحرك متوسط تكلفة الوحدات المتاحة قبل البيع. لاحظ أن الكمية المتبقية واحدة في الطرق الثلاث.",
    operations: [
      { type: "purchase", date: "2026-01-01", quantity: "100", unitCost: "10" },
      { type: "purchase", date: "2026-01-02", quantity: "100", unitCost: "15" },
      { type: "purchase", date: "2026-01-03", quantity: "100", unitCost: "20" },
      { type: "sale", date: "2026-01-04", quantity: "50", unitCost: null },
      { type: "sale", date: "2026-01-05", quantity: "60", unitCost: null },
      { type: "sale", date: "2026-01-06", quantity: "70", unitCost: null },
      { type: "sale", date: "2026-01-07", quantity: "40", unitCost: null },
    ],
  },
  moving: {
    title: "مثال 2: تسع عمليات",
    lesson: "في هذا المثال تتخلل المبيعات عمليات الشراء. يدخل في كل متوسط جديد المخزون المتبقي وقت الشراء فقط، ولا تدخل الوحدات المباعة سابقًا. افتح تفاصيل المبيعات في السجل لتتبّع تغير المتوسط؛ فهو متوسط متحرك لا دوري.",
    operations: [
      { type: "purchase", date: "2026-02-01", quantity: "100", unitCost: "10" },
      { type: "sale", date: "2026-02-02", quantity: "40", unitCost: null },
      { type: "purchase", date: "2026-02-03", quantity: "60", unitCost: "14" },
      { type: "sale", date: "2026-02-04", quantity: "50", unitCost: null },
      { type: "purchase", date: "2026-02-05", quantity: "80", unitCost: "18" },
      { type: "sale", date: "2026-02-06", quantity: "70", unitCost: null },
      { type: "purchase", date: "2026-02-07", quantity: "40", unitCost: "22" },
      { type: "sale", date: "2026-02-08", quantity: "30", unitCost: null },
      { type: "sale", date: "2026-02-09", quantity: "20", unitCost: null },
    ],
  },
};
