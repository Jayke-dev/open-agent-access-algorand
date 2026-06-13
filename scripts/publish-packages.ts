import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface WorkspacePackage {
  dir: string;
  manifest: PackageJson;
}

const dryRun = process.argv.includes("--dry-run") || process.env.OAA_PUBLISH_DRY_RUN === "true";
const packages = await loadWorkspacePackages();
const ordered = topologicalSort(packages);

console.log(`publish order (${ordered.length} packages):`);
for (const pkg of ordered) console.log(`- ${pkg.manifest.name}@${pkg.manifest.version}`);

if (dryRun) {
  console.log("dry run: no npm registry writes performed");
  process.exit(0);
}

if (!process.env.NODE_AUTH_TOKEN) {
  console.error("NODE_AUTH_TOKEN is required for npm publishing");
  process.exit(1);
}

run("npm", ["whoami", "--registry", "https://registry.npmjs.org"], { label: "npm authentication check" });

for (const pkg of ordered) {
  if (await packageVersionExists(pkg.manifest.name, pkg.manifest.version)) {
    console.log(`skip ${pkg.manifest.name}@${pkg.manifest.version}: already published`);
    continue;
  }

  console.log(`publish ${pkg.manifest.name}@${pkg.manifest.version}`);
  run("corepack", [
    "pnpm",
    "--filter",
    pkg.manifest.name,
    "publish",
    "--access",
    "public",
    "--provenance",
    "--no-git-checks"
  ], { label: `publish ${pkg.manifest.name}` });
}

async function loadWorkspacePackages() {
  const entries = await readdir("packages", { withFileTypes: true });
  const packages: WorkspacePackage[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join("packages", entry.name);
    const manifest = JSON.parse(await readFile(join(dir, "package.json"), "utf8")) as PackageJson;
    if (manifest.private) continue;
    if (!manifest.name || !manifest.version) throw new Error(`${dir}/package.json must declare name and version`);
    packages.push({ dir, manifest });
  }
  return packages;
}

function topologicalSort(packages: WorkspacePackage[]) {
  const byName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const output: WorkspacePackage[] = [];

  for (const pkg of packages.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name))) visit(pkg);
  return output;

  function visit(pkg: WorkspacePackage) {
    if (visited.has(pkg.manifest.name)) return;
    if (visiting.has(pkg.manifest.name)) throw new Error(`Cycle detected at ${pkg.manifest.name}`);
    visiting.add(pkg.manifest.name);

    for (const dependencyName of workspaceDependencyNames(pkg.manifest)) {
      const dependency = byName.get(dependencyName);
      if (dependency) visit(dependency);
    }

    visiting.delete(pkg.manifest.name);
    visited.add(pkg.manifest.name);
    output.push(pkg);
  }
}

function workspaceDependencyNames(manifest: PackageJson) {
  return Object.entries({
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
    ...manifest.peerDependencies
  })
    .filter(([, range]) => range.startsWith("workspace:"))
    .map(([name]) => name)
    .sort();
}

async function packageVersionExists(name: string, version: string) {
  const result = spawnSync("npm", ["view", `${name}@${version}`, "version", "--registry", "https://registry.npmjs.org"], {
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.status === 0) return true;
  if (result.stderr.includes("E404") || result.stderr.includes("404 Not Found")) return false;
  throw new Error(`Could not check ${name}@${version} on npm:\n${result.stderr || result.stdout}`);
}

function run(command: string, args: string[], options: { label: string }) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${options.label} failed with exit code ${result.status ?? "unknown"}`);
  }
}
