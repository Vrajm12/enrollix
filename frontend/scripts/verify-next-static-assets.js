const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), ".next");
const manifestNames = [
  "app-build-manifest.json",
  "build-manifest.json",
  "react-loadable-manifest.json"
];

function collectStaticAssets(value, assets) {
  if (Array.isArray(value)) {
    for (const item of value) collectStaticAssets(item, assets);
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStaticAssets(item, assets);
    return;
  }

  if (typeof value === "string" && value.startsWith("static/")) {
    assets.add(value);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  if (!fs.existsSync(nextDir)) {
    console.error("Missing .next directory. Run `npm run build` first.");
    process.exit(1);
  }

  const assets = new Set();
  for (const manifestName of manifestNames) {
    const manifestPath = path.join(nextDir, manifestName);
    if (!fs.existsSync(manifestPath)) continue;
    collectStaticAssets(readJson(manifestPath), assets);
  }

  const missing = [];
  for (const asset of assets) {
    const assetPath = path.join(nextDir, ...asset.split("/"));
    if (!fs.existsSync(assetPath)) {
      missing.push(asset);
    }
  }

  const requiredDirs = ["static/chunks/app", "static/css"];
  for (const dir of requiredDirs) {
    const dirPath = path.join(nextDir, ...dir.split("/"));
    if (!fs.existsSync(dirPath)) {
      missing.push(`${dir}/`);
    }
  }

  if (missing.length > 0) {
    console.error("Next build is missing static assets required by its manifests:");
    for (const asset of missing) {
      console.error(`- .next/${asset}`);
    }
    process.exit(1);
  }

  console.log(`Verified ${assets.size} Next static asset(s) in .next.`);
}

main();
