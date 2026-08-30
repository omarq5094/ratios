const SAUDI_BANK_SYMBOLS = new Set([
  "1010",
  "1020",
  "1030",
  "1050",
  "1060",
  "1080",
  "1120",
  "1140",
  "1150",
  "1180",
]);

function cleanSymbol(value) {
  const match = String(value || "").match(/(\d{4})/);
  return match ? match[1] : "";
}

export function detectCompanyType({ symbol = "", industry = "", sector = "" } = {}) {
  if (SAUDI_BANK_SYMBOLS.has(cleanSymbol(symbol))) return "bank";

  const normalizedIndustry = String(industry || "").trim().toLowerCase();
  const normalizedSector = String(sector || "").trim().toLowerCase();
  const bankIndustry = /(?:^|\b)(?:bank|banks|banking)(?:\b|$)|بنوك|مصرف|مصارف/.test(normalizedIndustry);
  const bankSector = /بنوك/.test(normalizedSector);
  return bankIndustry || bankSector ? "bank" : "operating";
}

export { SAUDI_BANK_SYMBOLS };
