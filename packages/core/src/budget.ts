import type { Budget, PricePolicy } from "./types.js";

export function parseDecimalAmount(value: string): number {
  const trimmed = value.trim().replace(/^\$/, "");
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid amount: ${value}`);
  }
  return parsed;
}

export function parseBudget(value: string): Budget {
  const [currency, amount] = value.split(":");
  if (!currency || !amount) {
    throw new Error("Budget must be formatted as CURRENCY:amount, for example USD:0.05");
  }
  return { currency: currency.toUpperCase(), amount };
}

export function budgetAllowsPrice(budget: Budget | undefined, price: PricePolicy | undefined): boolean {
  if (!price) {
    return true;
  }
  if (!budget) {
    return false;
  }
  if (budget.currency.toUpperCase() !== price.currency.toUpperCase()) {
    return false;
  }
  return parseDecimalAmount(budget.amount) >= parseDecimalAmount(price.amount);
}

export function formatPrice(price: PricePolicy): string {
  return `${price.currency.toUpperCase()} ${price.amount}${price.unit ? `/${price.unit}` : ""}`;
}
