import { Request } from "express";

const reservedSubdomains = new Set([
  "www",
  "api",
  "app",
  "admin",
  "localhost",
  "127",
  "0"
]);

const normalizeHost = (rawHost: string) => rawHost.toLowerCase().split(":")[0].trim();

const isValidSlug = (slug: string) => /^[a-z0-9-]+$/.test(slug) && !reservedSubdomains.has(slug);

const readHostnameFromOrigin = (origin: string | undefined) => {
  if (!origin) return null;
  try {
    const hostname = new URL(origin).hostname;
    return normalizeHost(hostname);
  } catch {
    return null;
  }
};

const slugFromHost = (host: string, rootDomain: string) => {
  if (!host) return null;
  const normalizedHost = normalizeHost(host);
  const normalizedRoot = rootDomain.toLowerCase().trim();

  if (normalizedHost.endsWith(`.${normalizedRoot}`)) {
    const left = normalizedHost.slice(0, -(`.${normalizedRoot}`.length));
    const slug = left.split(".")[0];
    return slug && isValidSlug(slug) ? slug : null;
  }

  if (normalizedHost.endsWith(".localhost")) {
    const slug = normalizedHost.slice(0, -".localhost".length).split(".")[0];
    return slug && isValidSlug(slug) ? slug : null;
  }

  return null;
};

export const resolveTenantSlugFromRequest = (req: Request, rootDomain: string): string | null => {
  const headerSlug = String(req.headers["x-tenant-slug"] ?? "").trim().toLowerCase();
  if (headerSlug && isValidSlug(headerSlug)) {
    return headerSlug;
  }

  const hostHeader = String(req.headers.host ?? "").trim();
  const fromHost = slugFromHost(hostHeader, rootDomain);
  if (fromHost) return fromHost;

  const fromOriginHost = readHostnameFromOrigin(
    typeof req.headers.origin === "string" ? req.headers.origin : undefined
  );
  if (fromOriginHost) {
    return slugFromHost(fromOriginHost, rootDomain);
  }

  return null;
};

