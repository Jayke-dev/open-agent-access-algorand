import { createHash, randomUUID } from "node:crypto";

export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeJson(entry)).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .filter((key) => object[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(object[key])}`)
    .join(",")}}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashCanonicalJson(value: unknown): string {
  return sha256Hex(canonicalizeJson(value));
}

export function createTraceId(): string {
  return randomUUID();
}

export function createReceiptId(): string {
  return `oaa_${randomUUID()}`;
}
