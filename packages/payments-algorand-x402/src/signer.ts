export interface SecureSigner {
  sign(payload: Uint8Array): Promise<Uint8Array>;
  address?: string;
}

export function readMnemonicFromEnv(envName = "AVM_MNEMONIC"): string | undefined {
  return process.env[envName];
}

export function assertNoSecretLogging(value: string): string {
  if (value.length <= 8) {
    return "[redacted]";
  }
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}
