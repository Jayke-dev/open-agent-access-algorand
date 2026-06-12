import { spawnSync } from "node:child_process";

const manifests = spawnSync("rg", ["--files", "packages", "-g", "package.json"], { encoding: "utf8" });
if (manifests.status !== 0) {
  console.error(manifests.stderr || "failed to list package manifests");
  process.exit(1);
}

for (const manifest of manifests.stdout.split("\n").filter(Boolean).sort()) {
  const dir = manifest.replace(/\/package\.json$/, "");
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: dir,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    console.error(`pack dry-run failed for ${dir}`);
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(1);
  }
  console.log(`pack dry-run passed: ${dir}`);
}
