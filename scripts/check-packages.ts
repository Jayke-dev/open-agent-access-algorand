import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

interface PackageJson {
  name?: string;
  version?: string;
  license?: string;
  type?: string;
  exports?: unknown;
  publishConfig?: { access?: string };
  files?: string[];
}

const listed = spawnSync("rg", ["--files", "packages", "-g", "package.json"], { encoding: "utf8" });
if (listed.status !== 0) {
  console.error(listed.stderr || "failed to list package manifests");
  process.exit(1);
}

const failures: string[] = [];
for (const manifestPath of listed.stdout.split("\n").filter(Boolean).sort()) {
  const packageDir = manifestPath.slice(0, -"package.json".length).replace(/\/$/, "");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PackageJson;
  check(Boolean(manifest.name?.startsWith("@open-agent-access/")), manifestPath, "package name must use @open-agent-access scope");
  check(Boolean(manifest.version), manifestPath, "version is required");
  check(manifest.license === "Apache-2.0", manifestPath, "license must be Apache-2.0");
  check(manifest.type === "module", manifestPath, "type must be module");
  check(Boolean(manifest.exports), manifestPath, "exports map is required");
  check(manifest.publishConfig?.access === "public", manifestPath, "publishConfig.access must be public");
  check(Boolean(manifest.files?.includes("src")), manifestPath, "files must include src");
  check(Boolean(manifest.files?.includes("README.md")), manifestPath, "files must include README.md");
  check(await exists(join(packageDir, "README.md")), manifestPath, "package README.md is required");
  check(await exists(join(packageDir, "src", "index.ts")), manifestPath, "src/index.ts is required");
}

if (failures.length) {
  console.error("package check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("package check passed");

function check(condition: boolean, manifestPath: string, message: string) {
  if (!condition) failures.push(`${manifestPath}: ${message}`);
}

async function exists(path: string) {
  return stat(path).then(() => true).catch(() => false);
}
