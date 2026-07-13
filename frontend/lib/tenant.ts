const RESERVED = new Set(["www", "app", "admin", "api", "localhost"]);

const rootDomains = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "guruverse.co.in,guruverse.com")
  .toLowerCase()
  .split(",")
  .map((domain) => domain.trim())
  .filter(Boolean);

const isValid = (slug: string) => /^[a-z0-9-]+$/.test(slug) && !RESERVED.has(slug);

export const getTenantSlugFromHost = (): string | null => {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  for (const normalizedRoot of rootDomains) {
    if (host === normalizedRoot) return null;

    if (host.endsWith(`.${normalizedRoot}`)) {
      const left = host.slice(0, -(`.${normalizedRoot}`.length));
      const slug = left.split(".")[0];
      if (slug && isValid(slug)) return slug;
    }
  }

  if (host.endsWith(".localhost")) {
    const slug = host.slice(0, -".localhost".length).split(".")[0];
    return slug && isValid(slug) ? slug : null;
  }

  return null;
};
