import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const allowed = new Set([
  ".env.example",
  "README.md",
  "SECURITY.md",
  "docs/ALGORAND_X402.md"
]);

const patterns = [
  { name: "secret_env_assignment", regex: /(?:^|\n)\s*(?:export\s+)?(?:AVM_MNEMONIC|MNEMONIC|SEED_PHRASE|PRIVATE_KEY)\s*=\s*["']?[a-zA-Z0-9][^"'\n]{12,}/i },
  { name: "algorand_mnemonic_words", regex: /\b([a-z]{3,12}\s+){24}[a-z]{3,12}\b/i },
  { name: "private_key_block", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ }
];

const files = spawnSync("rg", ["--files", "-g", "!node_modules", "-g", "!dist", "-g", "!coverage", "-g", "!.oaa"], {
  encoding: "utf8"
});

if (files.status !== 0 && files.stdout.trim() === "") {
  console.error(files.stderr || "failed to list files");
  process.exit(1);
}

const findings: string[] = [];
for (const file of files.stdout.split("\n").filter(Boolean)) {
  if (allowed.has(file) || file.endsWith("pnpm-lock.yaml")) {
    continue;
  }
  const text = await readFile(file, "utf8").catch(() => "");
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      findings.push(`${file}: ${pattern.name}`);
    }
  }
}

if (findings.length) {
  console.error("Potential secret material detected:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("secret check passed");
