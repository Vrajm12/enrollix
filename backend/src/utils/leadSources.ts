import { Prisma } from "@prisma/client";

export const DEFAULT_LEAD_SOURCES = [
  "Website",
  "Social Media",
  "Referral",
  "Advertisement",
  "Walk-in",
  "Collegedunia",
  "Meta Ads",
  "Google Ads",
  "Instagram Ads",
  "WhatsApp"
] as const;

const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

const sourceAliases: Record<string, string> = {
  website: "Website",
  web: "Website",
  socialmedia: "Social Media",
  social: "Social Media",
  referral: "Referral",
  referal: "Referral",
  advertisement: "Advertisement",
  ad: "Advertisement",
  ads: "Advertisement",
  walkin: "Walk-in",
  walkins: "Walk-in",
  collegedunia: "Collegedunia",
  collegeduniya: "Collegedunia",
  meta: "Meta Ads",
  metaad: "Meta Ads",
  metaads: "Meta Ads",
  facebook: "Meta Ads",
  facebookad: "Meta Ads",
  facebookads: "Meta Ads",
  fb: "Meta Ads",
  fbad: "Meta Ads",
  fbads: "Meta Ads",
  google: "Google Ads",
  googlead: "Google Ads",
  googleads: "Google Ads",
  adwords: "Google Ads",
  googleadwords: "Google Ads",
  instagram: "Instagram Ads",
  instagramad: "Instagram Ads",
  instagramads: "Instagram Ads",
  insta: "Instagram Ads",
  instaad: "Instagram Ads",
  instaads: "Instagram Ads",
  whatsapp: "WhatsApp",
  whatsap: "WhatsApp",
  wa: "WhatsApp"
};

const aliasesByCanonical = Object.entries(sourceAliases).reduce<Record<string, string[]>>(
  (accumulator, [aliasKey, canonical]) => {
    const canonicalKey = normalizeKey(canonical);
    accumulator[canonicalKey] = [...(accumulator[canonicalKey] ?? []), aliasKey];
    return accumulator;
  },
  {}
);

const sourceFilterTermsByCanonical: Record<string, string[]> = {
  [normalizeKey("Meta Ads")]: ["Meta Ads", "META ads", "Facebook Ads", "FB Ads", "Facebook", "FB"],
  [normalizeKey("Google Ads")]: ["Google Ads", "GOOGLE ads", "Google AdWords", "AdWords", "Google"],
  [normalizeKey("Instagram Ads")]: ["Instagram Ads", "Insta Ads", "Instagram"],
  [normalizeKey("WhatsApp")]: ["WhatsApp", "WA"],
  [normalizeKey("Walk-in")]: ["Walk-in", "Walkin", "Walk In"],
  [normalizeKey("Collegedunia")]: ["Collegedunia", "CollegeDunia"],
  [normalizeKey("Website")]: ["Website", "Web"],
  [normalizeKey("Social Media")]: ["Social Media", "Social"],
  [normalizeKey("Advertisement")]: ["Advertisement", "Ads", "Ad"],
  [normalizeKey("Referral")]: ["Referral", "Referal"]
};

export const normalizeLeadSource = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return sourceAliases[normalizeKey(trimmed)] ?? trimmed;
};

export const mergeLeadSources = (databaseSources: Array<string | null | undefined>) => {
  const sourceByKey = new Map<string, string>();

  for (const source of DEFAULT_LEAD_SOURCES) {
    sourceByKey.set(normalizeKey(source), source);
  }

  for (const source of databaseSources) {
    const normalized = normalizeLeadSource(source);
    if (normalized) {
      sourceByKey.set(normalizeKey(normalized), normalized);
    }
  }

  return Array.from(sourceByKey.values()).sort((a, b) => a.localeCompare(b));
};

export const getLeadSourceFilterTerms = (value: string) => {
  const normalized = normalizeLeadSource(value);
  if (!normalized) return [];

  const canonicalKey = normalizeKey(normalized);
  const terms = new Set<string>([value.trim(), normalized]);

  for (const term of sourceFilterTermsByCanonical[canonicalKey] ?? []) {
    terms.add(term);
  }

  for (const aliasKey of aliasesByCanonical[canonicalKey] ?? []) {
    const canonical = sourceAliases[aliasKey];
    if (canonical) terms.add(canonical);
  }

  return Array.from(terms).filter(Boolean);
};

export const buildLeadSourceWhere = (value: string): Prisma.LeadWhereInput => ({
  OR: getLeadSourceFilterTerms(value).map((term) => ({
    source: { equals: term, mode: "insensitive" as const }
  }))
});
