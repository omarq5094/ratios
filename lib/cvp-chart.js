// The plot always includes the expected sales as well as the true intersection.
export function chartDomain(r) {
  const maxQuantity = Math.min(Number.MAX_SAFE_INTEGER, Math.max(10, Math.ceil(r.breakEvenExact * 1.6), Math.ceil(r.input.quantity * 1.15)));
  return {
    maxQuantity,
    maxAmount: Math.max(r.input.price * maxQuantity, r.input.fixedCosts + r.input.variableCost * maxQuantity, 1) * 1.12,
  };
}

export function inspectQuantity(r, quantity) {
  const q = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(quantity)));
  const scaled = value => BigInt(value.toFixed(6).replace(".", ""));
  const p = scaled(r.input.price), v = scaled(r.input.variableCost), f = scaled(r.input.fixedCosts);
  const revenue = p * BigInt(q), costs = f + v * BigInt(q);
  return { quantity: q, revenue: Number(revenue) / 1e6, totalCosts: Number(costs) / 1e6, operatingProfit: Number(revenue - costs) / 1e6 };
}
