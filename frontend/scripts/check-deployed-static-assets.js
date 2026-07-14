const pageUrl = process.argv[2];

if (!pageUrl) {
  console.error("Usage: node scripts/check-deployed-static-assets.js https://tenant.example.com/login");
  process.exit(1);
}

const STATIC_ASSET_RE = /(?:href|src)=["'](\/_next\/static\/[^"']+)["']/g;

function expectedContent(pathname) {
  if (pathname.endsWith(".js")) return "javascript";
  if (pathname.endsWith(".css")) return "css";
  if (pathname.endsWith(".woff2")) return "font";
  return "";
}

async function fetchWithTimeout(url) {
  return fetch(url, {
    headers: {
      "cache-control": "no-cache",
      pragma: "no-cache"
    },
    signal: AbortSignal.timeout(15000)
  });
}

async function main() {
  const response = await fetchWithTimeout(pageUrl);
  const html = await response.text();

  if (!response.ok) {
    console.error(`Page request failed: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const assets = new Map();
  for (const match of html.matchAll(STATIC_ASSET_RE)) {
    const assetUrl = new URL(match[1], pageUrl);
    assets.set(assetUrl.href, assetUrl);
  }

  if (assets.size === 0) {
    console.error("No /_next/static assets found in the page HTML.");
    process.exit(1);
  }

  const failures = [];
  for (const [href, assetUrl] of assets) {
    try {
      const assetResponse = await fetchWithTimeout(href);
      const contentType = assetResponse.headers.get("content-type") || "";
      const expected = expectedContent(assetUrl.pathname);
      const wrongType = expected && !contentType.toLowerCase().includes(expected);

      if (!assetResponse.ok || wrongType) {
        failures.push({
          href,
          status: assetResponse.status,
          statusText: assetResponse.statusText,
          contentType
        });
      }
    } catch (error) {
      failures.push({
        href,
        status: "ERR",
        statusText: error instanceof Error ? error.message : String(error),
        contentType: ""
      });
    }
  }

  if (failures.length > 0) {
    console.error(`Static asset check failed for ${pageUrl}:`);
    for (const failure of failures) {
      console.error(`- ${failure.status} ${failure.href} ${failure.contentType || failure.statusText}`);
    }
    process.exit(1);
  }

  console.log(`Verified ${assets.size} deployed static asset(s) for ${pageUrl}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
