import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../public/manifest.json", import.meta.url), "utf8"));
const versionSource = await readFile(new URL("../src/version.ts", import.meta.url), "utf8");
const sourceMatch = versionSource.match(/EXTENSION_VERSION\s*=\s*["']([^"']+)["']/);
const versions = [packageJson.version, manifest.version, sourceMatch?.[1]];
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

if (versions.some((version) => typeof version !== "string" || !semverPattern.test(version))) {
  throw new Error(`Versions must use Semantic Versioning: ${versions.join(", ")}`);
}

if (!versions.every((version) => version === versions[0])) {
  throw new Error(`Version mismatch: package=${versions[0]}, manifest=${versions[1]}, source=${versions[2]}`);
}

const versionedManifest = JSON.parse(
  await readFile(new URL(`../public/manifest-v${versions[0]}.json`, import.meta.url), "utf8"),
);
if (versionedManifest.version !== versions[0]) {
  throw new Error(`Versioned manifest does not match ${versions[0]}`);
}

console.log(`Version ${versions[0]} is valid and synchronized.`);
