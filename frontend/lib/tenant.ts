const RESERVED = new Set(["www", "app", "admin", "api", "localhost"]);

const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "guruverse.com").toLowerCase();

const isValid = (slug: string) => /^[a-z0-9-]+$/.test(slug) && !RESERVED.has(slug);

export const getTenantSlugFromHost = (): string | null => {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  const parts = host.split(".").filter(Boolean);
  const firstLabel = parts[0] ?? "";

  // Dynamic fallback for multi-tenant subdomains, e.g. dvcoe.guruverse.co.in
  // Works even if NEXT_PUBLIC_ROOT_DOMAIN is not configured exactly.
  if (parts.length >= 3 && isValid(firstLabel)) {
    return firstLabel;
  }

  if (host.endsWith(`.${rootDomain}`)) {
    const left = host.slice(0, -(`.${rootDomain}`.length));
    const slug = left.split(".")[0];
    return slug && isValid(slug) ? slug : null;
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length).split(".")[0];
    return slug && isValid(slug) ? slug : null;
  }

  return null;
};
