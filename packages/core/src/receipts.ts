import { generateKeyPairSync, sign as nodeSign, verify as nodeVerify } from "node:crypto";
import { appendFile, mkdir, open, readFile, stat, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import type { ReceiptRecord } from "./types.js";
import { canonicalizeJson, createReceiptId, hashCanonicalJson } from "./hash.js";

export interface ReceiptMismatch {
  traceId: string;
  field: string;
  agentValue: unknown;
  siteValue: unknown;
}

export interface ReceiptReconciliationResult {
  valid: boolean;
  agentCount: number;
  siteCount: number;
  matched: number;
  missingSiteReceipts: string[];
  missingAgentReceipts: string[];
  mismatches: ReceiptMismatch[];
  agentLedgerErrors: string[];
  siteLedgerErrors: string[];
}

function withoutReceiptHash(record: ReceiptRecord): ReceiptRecord {
  const clone = { ...record };
  delete clone.receiptHash;
  return clone;
}

function withoutSignature(record: ReceiptRecord): ReceiptRecord {
  const clone = { ...record };
  delete clone.signature;
  return clone;
}

function receiptHashPayload(record: ReceiptRecord): ReceiptRecord {
  return withoutReceiptHash(withoutSignature(record));
}

export async function readReceiptLedger(path: string): Promise<ReceiptRecord[]> {
  try {
    const text = await readFile(path, "utf8");
    return text
      .split("\n")
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line) as ReceiptRecord;
        } catch (error) {
          throw new Error(`Invalid receipt JSON on line ${index + 1}: ${(error as Error).message}`);
        }
      });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function appendReceipt(path: string, input: Omit<ReceiptRecord, "receiptId" | "timestamp" | "previousHash" | "receiptHash"> & Partial<ReceiptRecord>): Promise<ReceiptRecord> {
  await mkdir(dirname(path), { recursive: true });
  return withReceiptLedgerLock(path, async () => {
    const existing = await readReceiptLedger(path);
    const previousHash = existing.at(-1)?.receiptHash;
    const receipt: ReceiptRecord = {
      ...input,
      receiptVersion: "0.1",
      receiptType: "agent_access",
      receiptId: input.receiptId ?? createReceiptId(),
      timestamp: input.timestamp ?? new Date().toISOString(),
      previousHash
    } as ReceiptRecord;
    receipt.receiptHash = hashCanonicalJson(receiptHashPayload(receipt));
    await appendFile(path, `${canonicalizeJson(receipt)}\n`, "utf8");
    return receipt;
  });
}

export function createReceiptSigningKeyPair() {
  const keyPair = generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });
  return {
    publicKeyPem: keyPair.publicKey,
    privateKeyPem: keyPair.privateKey
  };
}

export function signReceipt(receipt: ReceiptRecord, privateKeyPem: string, publicKeyPem?: string): ReceiptRecord {
  const payload = canonicalizeJson(withoutSignature(receipt));
  const signature = nodeSign(null, Buffer.from(payload), privateKeyPem).toString("base64");
  return {
    ...receipt,
    signature: {
      type: "ed25519",
      publicKeyPem,
      value: signature
    }
  };
}

export function verifyReceiptSignature(receipt: ReceiptRecord, publicKeyPem = receipt.signature?.publicKeyPem): boolean {
  if (!receipt.signature || !publicKeyPem) {
    return false;
  }
  if (receipt.signature.type !== "ed25519") {
    return false;
  }
  const payload = canonicalizeJson(withoutSignature(receipt));
  return nodeVerify(null, Buffer.from(payload), publicKeyPem, Buffer.from(receipt.signature.value, "base64"));
}

export async function verifyReceiptChain(path: string) {
  const exists = await stat(path).then(() => true).catch(() => false);
  if (!exists) {
    return { valid: true, count: 0, errors: [] as string[] };
  }
  let receipts: ReceiptRecord[];
  try {
    receipts = await readReceiptLedger(path);
  } catch (error) {
    return { valid: false, count: 0, errors: [(error as Error).message] };
  }
  const errors: string[] = [];
  let previousHash: string | undefined;
  receipts.forEach((receipt, index) => {
    if (receipt.previousHash !== previousHash) {
      errors.push(`line ${index + 1}: previousHash mismatch`);
    }
    const expected = hashCanonicalJson(receiptHashPayload(receipt));
    if (receipt.receiptHash !== expected) {
      errors.push(`line ${index + 1}: receiptHash mismatch`);
    }
    previousHash = receipt.receiptHash;
  });
  return { valid: errors.length === 0, count: receipts.length, errors };
}

export async function exportDigest(path: string) {
  const receipts = await readReceiptLedger(path);
  const head = receipts.at(-1)?.receiptHash;
  return {
    receiptVersion: "0.1",
    count: receipts.length,
    head,
    ledgerHash: hashCanonicalJson(receipts.map((receipt) => receipt.receiptHash))
  };
}

export async function reconcileReceiptLedgers(agentLedgerPath: string, siteLedgerPath: string): Promise<ReceiptReconciliationResult> {
  const [agentVerification, siteVerification] = await Promise.all([
    verifyReceiptChain(agentLedgerPath),
    verifyReceiptChain(siteLedgerPath)
  ]);
  const agentReceipts = agentVerification.valid ? await readReceiptLedger(agentLedgerPath) : [];
  const siteReceipts = siteVerification.valid ? await readReceiptLedger(siteLedgerPath) : [];
  const siteByTrace = indexByTraceId(siteReceipts);
  const agentByTrace = indexByTraceId(agentReceipts);
  const mismatches: ReceiptMismatch[] = [];
  const missingSiteReceipts: string[] = [];
  const missingAgentReceipts: string[] = [];
  let matched = 0;

  for (const agentReceipt of agentReceipts) {
    const siteReceipt = siteByTrace.get(agentReceipt.traceId);
    if (!siteReceipt) {
      missingSiteReceipts.push(agentReceipt.traceId);
      continue;
    }
    matched += 1;
    compareReceiptField(mismatches, agentReceipt.traceId, "method", agentReceipt.method, siteReceipt.method);
    compareReceiptField(mismatches, agentReceipt.traceId, "url", agentReceipt.url, siteReceipt.url);
    compareReceiptField(mismatches, agentReceipt.traceId, "origin", agentReceipt.origin, siteReceipt.origin);
    compareReceiptField(mismatches, agentReceipt.traceId, "policy.ruleId", agentReceipt.policy?.ruleId, siteReceipt.policy?.ruleId);
    compareReceiptField(mismatches, agentReceipt.traceId, "policy.policyHash", agentReceipt.policy?.policyHash, siteReceipt.policy?.policyHash);
    compareReceiptField(mismatches, agentReceipt.traceId, "policy.decision", agentReceipt.policy?.decision, siteReceipt.policy?.decision);
    compareReceiptField(mismatches, agentReceipt.traceId, "payment.required", agentReceipt.payment?.required, siteReceipt.payment?.required);
    compareReceiptField(mismatches, agentReceipt.traceId, "payment.type", agentReceipt.payment?.type, siteReceipt.payment?.type);
    compareReceiptField(mismatches, agentReceipt.traceId, "payment.settlement", agentReceipt.payment?.settlement, siteReceipt.payment?.settlement);
    compareReceiptField(mismatches, agentReceipt.traceId, "payment.network", agentReceipt.payment?.network, siteReceipt.payment?.network);
    compareReceiptField(mismatches, agentReceipt.traceId, "payment.price", canonicalizeComparable(agentReceipt.payment?.price), canonicalizeComparable(siteReceipt.payment?.price));
  }

  for (const siteReceipt of siteReceipts) {
    if (!agentByTrace.has(siteReceipt.traceId)) {
      missingAgentReceipts.push(siteReceipt.traceId);
    }
  }

  return {
    valid: agentVerification.valid && siteVerification.valid && missingSiteReceipts.length === 0 && missingAgentReceipts.length === 0 && mismatches.length === 0,
    agentCount: agentReceipts.length,
    siteCount: siteReceipts.length,
    matched,
    missingSiteReceipts,
    missingAgentReceipts,
    mismatches,
    agentLedgerErrors: agentVerification.errors,
    siteLedgerErrors: siteVerification.errors
  };
}

function indexByTraceId(receipts: ReceiptRecord[]) {
  const index = new Map<string, ReceiptRecord>();
  for (const receipt of receipts) {
    index.set(receipt.traceId, receipt);
  }
  return index;
}

function compareReceiptField(mismatches: ReceiptMismatch[], traceId: string, field: string, agentValue: unknown, siteValue: unknown) {
  if (canonicalizeComparable(agentValue) !== canonicalizeComparable(siteValue)) {
    mismatches.push({ traceId, field, agentValue, siteValue });
  }
}

function canonicalizeComparable(value: unknown): string {
  return canonicalizeJson(value ?? null);
}

async function withReceiptLedgerLock<T>(path: string, fn: () => Promise<T>): Promise<T> {
  const lockPath = `${path}.lock`;
  const deadline = Date.now() + 5_000;
  while (true) {
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(lockPath, "wx");
      await handle.writeFile(String(process.pid));
      await handle.close();
      try {
        return await fn();
      } finally {
        await unlink(lockPath).catch(() => undefined);
      }
    } catch (error) {
      await handle?.close().catch(() => undefined);
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(`Timed out waiting for receipt ledger lock: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}
