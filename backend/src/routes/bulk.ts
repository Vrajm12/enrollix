import { LeadStatus, Priority, Role } from "@prisma/client";
import { Router } from "express";
import { Readable } from "node:stream";
import multer from "multer";
import csvParser from "csv-parser";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildLeadSelect } from "../utils/leadCompatibility.js";
import { env } from "../config.js";
import { resolveTenantSlugFromRequest } from "../utils/tenantSlug.js";
import { invalidateDashboardSummaryCache } from "../services/dashboardSummaryCache.js";
import {
  AssignmentConfirmationError,
  assertAssignmentConfirmed,
  logLeadAssignmentChanges
} from "../services/leadAssignmentService.js";

const router = Router();
const MAX_UPLOAD_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_UPLOAD_ROWS = 50_000;
const MAX_PREVIEW_ROWS = 1_000;
const DB_WRITE_CHUNK_SIZE = 1_000;
const DUPLICATE_LOOKUP_CHUNK_SIZE = 1_000;
const STUDENT_CASTE_CATEGORIES = [
  "DT/VJ",
  "NT-B",
  "NT-C",
  "NT-D",
  "OBC",
  "SBC",
  "SEBC",
  "OPEN",
  "SC",
  "ST"
] as const;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE_BYTES,
    files: 1
  }
});

const importCsvSchema = z.object({
  csv: z.string().min(1, "CSV content is required")
});
const importChunkSchema = z.object({
  rows: z.array(
    z.object({
      name: z.string().trim().min(1),
      phone: z.string().trim().min(1),
      email: z.string().trim().email().nullable(),
      address: z.string().trim().nullable(),
      pincode: z.string().trim().nullable().optional(),
      studentCasteCategory: z.enum(STUDENT_CASTE_CATEGORIES).nullable().optional(),
      locality: z.string().trim().nullable().optional(),
      parentContact: z.string().trim().nullable(),
      course: z.string().trim().nullable(),
      source: z.string().trim().nullable(),
      status: z.nativeEnum(LeadStatus),
      priority: z.nativeEnum(Priority),
      nextFollowUp: z.string().datetime().nullable()
    })
  ).min(1).max(DB_WRITE_CHUNK_SIZE)
});

const bulkUpdateSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, "Select at least one lead"),
  confirmReassignment: z.boolean().optional().default(false),
  updates: z
    .object({
      status: z.nativeEnum(LeadStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
      assignedTo: z.number().int().positive().nullable().optional(),
      nextFollowUp: z.string().datetime().nullable().optional()
    })
    .refine(
      (value) => Object.values(value).some((field) => field !== undefined),
      "At least one update must be provided"
    )
});

const bulkDeleteSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1, "Select at least one lead")
});

const exportSchema = z.object({
  filters: z
    .object({
      status: z.nativeEnum(LeadStatus).optional(),
      priority: z.nativeEnum(Priority).optional(),
      assignedTo: z.number().int().positive().nullable().optional()
    })
    .optional(),
  columns: z.array(z.string().min(1)).min(1, "Choose at least one column")
});

type CanonicalHeader =
  | "sr_no"
  | "name"
  | "phone"
  | "email"
  | "location"
  | "state"
  | "city"
  | "locality"
  | "pincode"
  | "student_caste_category"
  | "address"
  | "parent_contact"
  | "course"
  | "source"
  | "status"
  | "priority"
  | "next_follow_up";

type PreviewStatus = "ready" | "duplicate" | "error";

type ParsedImportRow = {
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  pincode: string | null;
  studentCasteCategory: string | null;
  region: string | null;
  city: string | null;
  locality: string | null;
  parentContact: string | null;
  course: string | null;
  source: string | null;
  status: LeadStatus;
  priority: Priority;
  nextFollowUp: string | null;
};

type PreviewRow = {
  rowNumber: number;
  original: Record<string, string>;
  normalized: ParsedImportRow | null;
  status: PreviewStatus;
  reasons: string[];
};

type ImportAnalysis = {
  headers: CanonicalHeader[];
  rows: PreviewRow[];
  readyRows: ParsedImportRow[];
  summary: {
    totalRows: number;
    readyRows: number;
    duplicateRows: number;
    errorRows: number;
  };
  rowsTruncated: boolean;
  maxPreviewRows: number;
};

const headerAliases: Record<string, CanonicalHeader> = {
  sr_no: "sr_no",
  srno: "sr_no",
  serial_no: "sr_no",
  serialnumber: "sr_no",
  serial_number: "sr_no",
  name: "name",
  full_name: "name",
  fullname: "name",
  student_name: "name",
  phone: "phone",
  mobile: "phone",
  mobile_no: "phone",
  mobile_number: "phone",
  phone_no: "phone",
  phone_number: "phone",
  contact_number: "phone",
  email: "email",
  location: "location",
  state: "state",
  city: "city",
  locality: "locality",
  pincode: "pincode",
  student_caste_category: "student_caste_category",
  caste_category: "student_caste_category",
  student_category: "student_caste_category",
  student_caste: "student_caste_category",
  caste: "student_caste_category",
  email_id: "email",
  mail: "email",
  address: "address",
  parent_contact: "parent_contact",
  parent_phone: "parent_contact",
  parent_mobile: "parent_contact",
  guardian_contact: "parent_contact",
  course: "course",
  branch: "course",
  program: "course",
  source: "source",
  lead_source: "source",
  vendor: "source",
  status: "status",
  priority: "priority",
  next_follow_up: "next_follow_up",
  nextfollowup: "next_follow_up",
  follow_up: "next_follow_up",
  followup: "next_follow_up",
  district: "city",
  town: "locality",
  village: "locality",
  locality_name: "locality",
  city_town_village: "locality",
  city_village: "locality",
  region: "state",
  state_name: "state",
  city_name: "city",
  zip: "pincode",
  zipcode: "pincode",
  postal_code: "pincode",
  pin: "pincode",
  pin_code: "pincode"
};

const defaultRequiredHeaders: CanonicalHeader[] = ["name", "phone"];

const exportableColumns = [
  "sr_no",
  "name",
  "phone",
  "email",
  "address",
  "city",
  "locality",
  "state",
  "pincode",
  "student_caste_category",
  "parent_contact",
  "course",
  "source",
  "status",
  "priority",
  "next_follow_up",
  "assigned_counselor",
  "created_at",
  "updated_at"
] as const;

const nonEmpty = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizePincode = (value: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(0, 6);
};

const normalizeHeader = (header: string): CanonicalHeader | null => {
  const canonical = header
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[.\s/-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  return headerAliases[canonical] ?? null;
};

const toCsvValue = (value: string | number | null | undefined) => {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const buildCsv = (rows: Array<Array<string | number | null | undefined>>) =>
  rows.map((row) => row.map((value) => toCsvValue(value)).join(",")).join("\n");

const parseStatus = (value: string | null) => {
  if (!value) return { value: LeadStatus.LEAD, reason: null };
  const normalized = value.trim().toUpperCase();
  return Object.values(LeadStatus).includes(normalized as LeadStatus)
    ? { value: normalized as LeadStatus, reason: null }
    : { value: null, reason: `Unsupported status "${value}"` };
};

const parsePriority = (value: string | null) => {
  if (!value) return { value: Priority.COLD, reason: null };
  const normalized = value.trim().toUpperCase();
  return Object.values(Priority).includes(normalized as Priority)
    ? { value: normalized as Priority, reason: null }
    : { value: null, reason: `Unsupported priority "${value}"` };
};

const parseStudentCasteCategory = (value: string | null) => {
  if (!value) return { value: null, reason: null };
  const normalized = value.trim().toUpperCase();
  return (STUDENT_CASTE_CATEGORIES as readonly string[]).includes(normalized)
    ? { value: normalized, reason: null }
    : { value: null, reason: `Unsupported student_caste_category "${value}"` };
};

const parseNextFollowUp = (value: string | null) => {
  if (!value) return { value: null, reason: null };
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? { value: null, reason: `Invalid next_follow_up "${value}"` }
    : { value: date.toISOString(), reason: null };
};

const toTitleCase = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const STATE_TO_CITIES: Record<string, string[]> = {
  "Andaman and Nicobar Islands": ["Port Blair", "Diglipur", "Mayabunder", "Rangat"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  Assam: ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  Chandigarh: ["Chandigarh"],
  Chhattisgarh: ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati"],
  Delhi: ["New Delhi", "Dwarka", "Rohini", "Saket", "Karol Bagh", "Laxmi Nagar", "Delhi"],
  Goa: ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
  Haryana: ["Gurugram", "Gurgaon", "Faridabad", "Panipat", "Ambala", "Hisar", "Karnal"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Kullu"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  Karnataka: ["Bengaluru", "Bangalore", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Ballari", "Davanagere"],
  Kerala: ["Thiruvananthapuram", "Trivandrum", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti", "Agatti", "Amini"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
  Maharashtra: [
    "Ahmednagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Chhatrapati Sambhajinagar",
    "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City",
    "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Dharashiv", "Palghar", "Parbhani", "Pune",
    "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal",
    "Mumbai", "Aurangabad", "Osmanabad"
  ],
  Manipur: ["Imphal", "Thoubal", "Bishnupur", "Churachandpur"],
  Meghalaya: ["Shillong", "Tura", "Jowai", "Nongstoin"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai", "Kolasib"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung", "Tuensang"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Puri", "Berhampur"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  Rajasthan: ["Jaipur", "Udaipur", "Jodhpur", "Kota", "Ajmer", "Bikaner", "Alwar"],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing", "Mangan"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Erode", "Tirunelveli"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahbubnagar"],
  Tripura: ["Agartala", "Udaipur", "Dharmanagar", "Kailashahar"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani", "Roorkee", "Rudrapur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi", "Prayagraj", "Agra", "Meerut", "Gorakhpur"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol", "Kharagpur"]
};

const CITY_TO_STATE: Record<string, string> = Object.entries(STATE_TO_CITIES).reduce(
  (accumulator, [state, cities]) => {
    for (const city of cities) {
      accumulator[city.trim().toLowerCase()] = state;
    }
    return accumulator;
  },
  {} as Record<string, string>
);

const MAHARASHTRA_CITY_ALIASES = [
  "ahilyanagar", "ahmednagar", "chhatrapati sambhajinagar", "aurangabad", "dharashiv", "osmanabad",
  "achalpur", "aheri", "airoli", "akkalkot", "akkurdi", "akot", "alibag", "amalner", "ambad",
  "ambajogai", "ambarnath", "ambejogai", "amgaon", "amravati camp", "anjangaon surji", "arjuni morgaon",
  "arni", "arvi", "ashti", "atpadi", "aurad shahajani", "ausa", "badlapur", "balapur", "ballarpur",
  "baramati", "barshi", "basmat", "basmath", "belapur", "bhadgaon", "bhadravati", "bhandup", "bhayandar",
  "bhiwandi", "bhokar", "bhokardan", "bhor", "bhosari", "bhusawal", "biloli", "boisar", "brahmapuri",
  "buldana", "butibori", "chakan", "chalisgaon", "chandgad", "chandrapur midc", "chandur", "chandur bazar",
  "charholi", "chembur", "chikhli", "chimur", "chinchwad", "chiplun", "dahanu", "dapoli", "darwha",
  "daryapur", "daund", "deglur", "dehu", "deolali", "deoli", "deulgaon raja", "dharangaon", "dharni",
  "digras", "dindori", "dombivli", "erandol", "faizpur", "gadhinglaj", "gangakhed", "gangapur", "georai",
  "ghansawangi", "ghatanji", "gondpipri", "goregaon", "hadapsar", "hinganghat", "hinjawadi", "ichalkaranji",
  "igatpuri", "indapur", "islampur", "jaisingpur", "jamkhed", "jamner", "jath", "jejuri", "jintur", "junnar",
  "kagal", "kaij", "kalamb", "kalamnuri", "kalyan", "kamptee", "kandhar", "kannad", "karad", "karanja",
  "karjat", "karmala", "katol", "kavathe mahankal", "khed", "khopoli", "kinwat", "kolad", "kopargaon",
  "koregaon", "kudal", "kurduwadi", "kurla", "lanja", "lasalgaon", "latur midc", "lohara", "lonavala",
  "lonar", "madha", "mahabaleshwar", "mahad", "majalgaon", "malegaon", "malkapur", "malshiras", "malvan",
  "manchar", "mangaon", "mangrulpir", "manmad", "manora", "matheran", "mehkar", "mira road", "mira bhayandar",
  "mohadi", "mohol", "morshi", "motala", "muktainagar", "mul", "mulund", "murbad", "murgud", "murtijapur",
  "murud", "nagbhid", "nalasopara", "nandgaon", "narkhed", "narayangaon", "navi mumbai", "neral", "nevasa",
  "nilanga", "niphad", "ojhar", "omerga", "pachora", "paithan", "palus", "pandharpur", "panvel", "paranda",
  "parli", "parli vaijnath", "partur", "pathardi", "pathri", "patur", "pauni", "pen", "phaltan", "pimpri",
  "pimpri chinchwad", "pusad", "rahata", "rahuri", "rajapur", "rajgurunagar", "rajura", "ralegaon", "ramtek",
  "ranjangaon", "raver", "risod", "sailu", "sakoli", "sakri", "sangamner", "sangola", "saswad", "satpur",
  "sawantwadi", "selu", "shahada", "shegaon", "shendurjana", "shikrapur", "shirdi", "shirpur", "shirur",
  "shirwal", "shrigonda", "shrirampur", "sillod", "sinnar", "sironcha", "solapur midc", "sonai", "tasgaon",
  "telhara", "tembhurni", "thakurli", "tirora", "tuljapur", "tumsar", "udgir", "ulhasnagar", "umarga",
  "umarkhed", "umred", "uran", "uruli kanchan", "vaijapur", "vasai", "vashi", "vita", "wadgaon", "wagholi",
  "wai", "waluj", "wani", "warora", "warud", "washim midc", "yawal", "yeola", "yevla"
];

for (const alias of MAHARASHTRA_CITY_ALIASES) {
  CITY_TO_STATE[alias] = "Maharashtra";
}

const inferRegionAndCity = (input: {
  state: string | null;
  city: string | null;
  location: string | null;
  pincode: string | null;
}) => {
  let city = input.city ?? input.location;
  let region = input.state;

  if (city && city.includes(",")) {
    const [firstPart, secondPart] = city.split(",").map((part) => part.trim()).filter(Boolean);
    if (firstPart) city = firstPart;
    if (!region && secondPart) region = secondPart;
  }

  const cityKey = city?.trim().toLowerCase() ?? "";
  if (!region && cityKey && CITY_TO_STATE[cityKey]) {
    region = CITY_TO_STATE[cityKey];
  }

  if (!region && input.pincode) {
    const prefix = Number(input.pincode.slice(0, 2));
    if (prefix >= 11 && prefix <= 28) region = "Delhi";
    else if (prefix >= 30 && prefix <= 34) region = "Rajasthan";
    else if (prefix >= 36 && prefix <= 39) region = "Gujarat";
    else if (prefix >= 40 && prefix <= 44) region = "Maharashtra";
    else if (prefix >= 45 && prefix <= 48) region = "Madhya Pradesh";
    else if (prefix >= 50 && prefix <= 53) region = "Andhra Pradesh";
    else if (prefix >= 56 && prefix <= 59) region = "Karnataka";
    else if (prefix >= 60 && prefix <= 64) region = "Tamil Nadu";
    else if (prefix >= 67 && prefix <= 69) region = "Kerala";
    else if (prefix >= 70 && prefix <= 74) region = "West Bengal";
    else if (prefix >= 75 && prefix <= 77) region = "Odisha";
    else if (prefix >= 80 && prefix <= 85) region = "Bihar";
    else if (prefix >= 90 && prefix <= 99) region = "Army Postal Service";
  }

  return {
    city: city ? toTitleCase(city) : null,
    region: region ? toTitleCase(region) : null
  };
};

const chunkArray = <T>(items: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
};

const findExistingLeadMatches = async (tenantId: number, phones: string[], emails: string[]) => {
  const existingByPhone = new Map<string, { name: string }>();
  const existingByEmail = new Map<string, { name: string }>();

  const phoneChunks = chunkArray(phones, DUPLICATE_LOOKUP_CHUNK_SIZE);
  for (const phoneChunk of phoneChunks) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await prisma.lead.findMany({
      where: { tenantId, phone: { in: phoneChunk } },
      select: { phone: true, name: true }
    });
    existing.forEach((lead) => existingByPhone.set(lead.phone, { name: lead.name }));
  }

  const emailChunks = chunkArray(emails, DUPLICATE_LOOKUP_CHUNK_SIZE);
  for (const emailChunk of emailChunks) {
    // eslint-disable-next-line no-await-in-loop
    const existing = await prisma.lead.findMany({
      where: { tenantId, email: { in: emailChunk } },
      select: { email: true, name: true }
    });
    existing.forEach((lead) => {
      if (lead.email) existingByEmail.set(lead.email, { name: lead.name });
    });
  }

  return { existingByPhone, existingByEmail };
};

const parseRowsFromCsv = async (
  csvText: string,
  requiredHeaders: CanonicalHeader[]
) => {
  const parser = csvParser({
    mapHeaders: ({ header }) => header?.trim?.() ?? header
  });

  const previewRows: PreviewRow[] = [];
  const readyRowsWithMeta: Array<{
    rowNumber: number;
    data: ParsedImportRow;
  }> = [];
  const phoneCounts = new Map<string, number>();
  const emailCounts = new Map<string, number>();

  let headers: CanonicalHeader[] = [];
  let rawHeaders: string[] = [];
  let canonicalToRawHeader = new Map<CanonicalHeader, string>();
  let headerInitialized = false;
  let parsedDataRowCount = 0;

  const rowStream = Readable.from([csvText]).pipe(parser);

  for await (const rawRecord of rowStream as AsyncIterable<Record<string, string>>) {
    if (!headerInitialized) {
      rawHeaders = Object.keys(rawRecord);
      headers = rawHeaders
        .map((header) => normalizeHeader(header))
        .filter((header): header is CanonicalHeader => header !== null);
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required header(s): ${missingHeaders.join(", ")}`);
      }
      canonicalToRawHeader = new Map<CanonicalHeader, string>();
      rawHeaders.forEach((rawHeader) => {
        const normalized = normalizeHeader(rawHeader);
        if (normalized && !canonicalToRawHeader.has(normalized)) {
          canonicalToRawHeader.set(normalized, rawHeader);
        }
      });
      headerInitialized = true;
    }

    parsedDataRowCount += 1;
    if (parsedDataRowCount > MAX_UPLOAD_ROWS) {
      throw new Error("Maximum 50,000 leads allowed per upload.");
    }

    const rowNumber = parsedDataRowCount + 1;
    const getCell = (header: CanonicalHeader) => {
      const rawHeader = canonicalToRawHeader.get(header);
      return String(rawHeader ? rawRecord[rawHeader] ?? "" : "").trim();
    };

    const original = rawHeaders.reduce<Record<string, string>>((accumulator, header) => {
      accumulator[header] = String(rawRecord[header] ?? "");
      return accumulator;
    }, {});

    const reasons: string[] = [];
    const name = getCell("name").trim();
    const phone = getCell("phone").trim();
    const email = nonEmpty(getCell("email"));
    const course = nonEmpty(getCell("course"));
    const rawLocation = nonEmpty(getCell("location"));
    const rawState = nonEmpty(getCell("state"));
    const rawCity = nonEmpty(getCell("city"));
    const rawLocality = nonEmpty(getCell("locality"));
    const pincode = normalizePincode(nonEmpty(getCell("pincode")));
    const inferredGeo = inferRegionAndCity({
      state: rawState,
      city: rawCity,
      location: rawLocation,
      pincode
    });

    if (!name) reasons.push("Name is required");
    if (!phone) reasons.push("Phone is required");

    if (email && !z.string().email().safeParse(email).success) {
      reasons.push(`Invalid email "${email}"`);
    }

    const parsedStatus = parseStatus(nonEmpty(getCell("status")));
    const parsedPriority = parsePriority(nonEmpty(getCell("priority")));
    const parsedStudentCasteCategory = parseStudentCasteCategory(nonEmpty(getCell("student_caste_category")));
    const parsedNextFollowUp = parseNextFollowUp(nonEmpty(getCell("next_follow_up")));

    if (parsedStatus.reason) reasons.push(parsedStatus.reason);
    if (parsedPriority.reason) reasons.push(parsedPriority.reason);
    if (parsedStudentCasteCategory.reason) reasons.push(parsedStudentCasteCategory.reason);
    if (parsedNextFollowUp.reason) reasons.push(parsedNextFollowUp.reason);

    const normalized =
      reasons.length === 0
        ? {
            name,
            phone,
            email,
            address: nonEmpty(getCell("address")),
            pincode,
            studentCasteCategory: parsedStudentCasteCategory.value,
            region: inferredGeo.region,
            city: inferredGeo.city,
            locality: rawLocality ?? (rawCity ? rawLocation : null),
            parentContact: nonEmpty(getCell("parent_contact")),
            course,
            source: nonEmpty(getCell("source")),
            status: parsedStatus.value ?? LeadStatus.LEAD,
            priority: parsedPriority.value ?? Priority.COLD,
            nextFollowUp: parsedNextFollowUp.value
          }
        : null;

    if (normalized) {
      readyRowsWithMeta.push({ rowNumber, data: normalized });
      phoneCounts.set(normalized.phone, (phoneCounts.get(normalized.phone) ?? 0) + 1);
      if (normalized.email) {
        emailCounts.set(normalized.email, (emailCounts.get(normalized.email) ?? 0) + 1);
      }
    }

    if (previewRows.length < MAX_PREVIEW_ROWS) {
      previewRows.push({
        rowNumber,
        original,
        normalized,
        status: reasons.length > 0 ? "error" : "ready",
        reasons
      });
    }
  }

  if (!headerInitialized) {
    throw new Error("CSV file is empty");
  }

  return {
    headers,
    previewRows,
    readyRowsWithMeta,
    phoneCounts,
    emailCounts,
    totalRows: parsedDataRowCount
  };
};

const analyzeCsvImport = async (csv: string, tenantId: number): Promise<ImportAnalysis> => {
  const requiredHeaders = defaultRequiredHeaders;

  const parsed = await parseRowsFromCsv(csv, requiredHeaders);
  const { existingByPhone, existingByEmail } = await findExistingLeadMatches(
    tenantId,
    [...parsed.phoneCounts.keys()],
    [...parsed.emailCounts.keys()]
  );

  const duplicateReasonsByRow = new Map<number, string[]>();

  parsed.readyRowsWithMeta.forEach((row) => {
    const reasons: string[] = [];
    if ((parsed.phoneCounts.get(row.data.phone) ?? 0) > 1) {
      reasons.push("Duplicate phone found in uploaded file");
    }
    if (row.data.email && (parsed.emailCounts.get(row.data.email) ?? 0) > 1) {
      reasons.push("Duplicate email found in uploaded file");
    }

    const existingPhoneLead = existingByPhone.get(row.data.phone);
    if (existingPhoneLead) {
      reasons.push(`Phone already exists in CRM (${existingPhoneLead.name})`);
    }

    if (row.data.email) {
      const existingEmailLead = existingByEmail.get(row.data.email);
      if (existingEmailLead) {
        reasons.push(`Email already exists in CRM (${existingEmailLead.name})`);
      }
    }

    if (reasons.length > 0) {
      duplicateReasonsByRow.set(row.rowNumber, reasons);
    }
  });

  let errorRows = 0;
  let duplicateRows = 0;
  let readyRowsCount = 0;

  parsed.previewRows.forEach((row) => {
    if (row.status === "error") {
      errorRows += 1;
      return;
    }

    const duplicateReasons = duplicateReasonsByRow.get(row.rowNumber) ?? [];
    if (duplicateReasons.length > 0) {
      row.status = "duplicate";
      row.reasons.push(...duplicateReasons);
      duplicateRows += 1;
      return;
    }

    readyRowsCount += 1;
  });

  // Count rows not present in preview (when file has > MAX_PREVIEW_ROWS rows)
  const previewedRowNumbers = new Set(parsed.previewRows.map((row) => row.rowNumber));
  parsed.readyRowsWithMeta.forEach((row) => {
    if (previewedRowNumbers.has(row.rowNumber)) return;
    if (duplicateReasonsByRow.has(row.rowNumber)) {
      duplicateRows += 1;
    } else {
      readyRowsCount += 1;
    }
  });

  // Non-ready row count among all rows = total - ready - duplicate
  errorRows = parsed.totalRows - readyRowsCount - duplicateRows;

  const readyRows = parsed.readyRowsWithMeta
    .filter((row) => !duplicateReasonsByRow.has(row.rowNumber))
    .map((row) => row.data);

  return {
    headers: parsed.headers,
    rows: parsed.previewRows,
    readyRows,
    summary: {
      totalRows: parsed.totalRows,
      readyRows: readyRowsCount,
      duplicateRows,
      errorRows
    },
    rowsTruncated: parsed.totalRows > MAX_PREVIEW_ROWS,
    maxPreviewRows: MAX_PREVIEW_ROWS
  };
};

const logImportContext = (req: any, stage: string, extra?: Record<string, unknown>) => {
  const resolvedTenantSlug = resolveTenantSlugFromRequest(req, env.ROOT_DOMAIN);
  // eslint-disable-next-line no-console
  console.log("[bulk.import.csv.preview]", {
    stage,
    method: req.method,
    path: req.originalUrl,
    origin: req.headers.origin ?? null,
    host: req.headers.host ?? null,
    tenantHeader: req.headers["x-tenant-slug"] ?? null,
    resolvedTenantSlug,
    authUserId: req.user?.id ?? null,
    authTenantId: req.user?.tenantId ?? null,
    role: req.user?.role ?? null,
    ...extra
  });
};

const extractCsvFromPreviewRequest = (req: any) => {
  if (typeof req.body?.csv === "string" && req.body.csv.trim().length > 0) {
    return req.body.csv;
  }

  const uploaded = req.file as Express.Multer.File | undefined;
  if (uploaded?.buffer?.length) {
    return uploaded.buffer.toString("utf-8");
  }

  return null;
};

const withUpload = (req: any, res: any): Promise<void> =>
  new Promise((resolve, reject) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) return reject(error);
      resolve();
    });
  });

const buildAccessibleLeadWhere = (
  leadIds: number[] | null,
  reqUser: Express.UserPayload
) => {
  // ✅ CRITICAL: Always include tenantId filter to prevent cross-tenant access
  const baseWhere =
    reqUser.role === Role.COUNSELOR
      ? {
          tenantId: reqUser.tenantId,
          OR: [{ assignedTo: reqUser.id }, { assignedTo: null }]
        }
      : {
          tenantId: reqUser.tenantId
        };

  return leadIds
    ? {
        ...baseWhere,
        id: { in: leadIds }
      }
    : baseWhere;
};

router.post(
  "/import/csv/preview",
  asyncHandler(async (req, res) => {
    try {
      if (String(req.headers["content-type"] ?? "").includes("multipart/form-data")) {
        await withUpload(req, res);
      }
    } catch (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Uploaded file is too large. Maximum allowed size is 50 MB."
        });
      }
      return res.status(400).json({
        message: "Invalid CSV upload payload"
      });
    }

    logImportContext(req, "request_received", {
      hasFile: Boolean(req.file),
      contentType: req.headers["content-type"] ?? null
    });

    const csv = extractCsvFromPreviewRequest(req);
    const parsed = importCsvSchema.safeParse({ csv });
    if (!parsed.success) {
      logImportContext(req, "validation_failed", {
        validationErrors: parsed.error.flatten()
      });
      return res.status(400).json({
        message: "Invalid CSV import payload",
        errors: parsed.error.flatten()
      });
    }

    try {
      const analysis = await analyzeCsvImport(parsed.data.csv, req.user!.tenantId);
      logImportContext(req, "analysis_success", {
        totalRows: analysis.summary.totalRows,
        readyRows: analysis.summary.readyRows,
        duplicateRows: analysis.summary.duplicateRows,
        errorRows: analysis.summary.errorRows
      });
      return res.json(analysis);
    } catch (error) {
      logImportContext(req, "analysis_failed", {
        error: error instanceof Error ? error.message : "Unknown CSV parsing error"
      });
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Unable to parse CSV"
      });
    }
  })
);

router.post(
  "/import/csv/commit",
  asyncHandler(async (req, res) => {
    try {
      if (String(req.headers["content-type"] ?? "").includes("multipart/form-data")) {
        await withUpload(req, res);
      }
    } catch (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Uploaded file is too large. Maximum allowed size is 50 MB."
        });
      }
      return res.status(400).json({
        message: "Invalid CSV upload payload"
      });
    }

    const csv = extractCsvFromPreviewRequest(req);
    const parsed = importCsvSchema.safeParse({ csv });
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid CSV import payload",
        errors: parsed.error.flatten()
      });
    }

    try {
      const analysis = await analyzeCsvImport(parsed.data.csv, req.user!.tenantId);
      const readyRows = analysis.readyRows;

      if (readyRows.length === 0) {
        return res.status(400).json({
          message: "No valid leads available to import",
          ...analysis.summary
        });
      }

      let createdCount = 0;
      const skipped = [];
      for (const chunk of chunkArray(readyRows, DB_WRITE_CHUNK_SIZE)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const createdLeads = await prisma.$transaction(async (tx) => {
            const inserted = await tx.lead.createManyAndReturn({
              data: chunk.map((row) => ({
                tenantId: req.user!.tenantId,
                name: row.name,
                phone: row.phone,
                email: row.email,
                address: row.address,
                pincode: row.pincode,
                studentCasteCategory: row.studentCasteCategory,
                region: row.region,
                city: row.city,
                locality: row.locality,
                parentContact: row.parentContact,
                course: row.course,
                source: row.source,
                status: row.status,
                priority: row.priority,
                nextFollowUp: row.nextFollowUp ? new Date(row.nextFollowUp) : null,
                assignedTo: req.user?.role === Role.COUNSELOR ? req.user.id : null
              })),
              skipDuplicates: true,
              select: { id: true, tenantId: true }
            });

            if (req.user?.role === Role.COUNSELOR && inserted.length > 0) {
              await logLeadAssignmentChanges(
                tx,
                inserted.map((lead) => ({ ...lead, assignedTo: null })),
                req.user.id,
                {
                  assignedBy: req.user.id,
                  sourceModule: "bulk.import.csv",
                  ipAddress: req.ip ?? null,
                  userAgent: req.get("user-agent") ?? null
                }
              );
            }

            return inserted;
          });
          createdCount += createdLeads.length;
        } catch (error) {
          skipped.push({
            rowNumber: -1,
            name: "Chunk",
            reason: error instanceof Error ? error.message : "Chunk import failed"
          });
        }
      }

      const skippedCount = Math.max(0, readyRows.length - createdCount) + skipped.length;
      invalidateDashboardSummaryCache(req.user!.tenantId);

      return res.status(201).json({
        message: `Imported ${createdCount} lead${createdCount === 1 ? "" : "s"}`,
        createdCount,
        skippedCount,
        duplicateCount: analysis.summary.duplicateRows,
        errorCount: analysis.summary.errorRows,
        created: [],
        skipped
      });
      
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Unable to import CSV"
      });
    }
  })
);

router.post(
  "/import/csv/chunk",
  asyncHandler(async (req, res) => {
    const parsed = importChunkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid import chunk payload",
        errors: parsed.error.flatten()
      });
    }

    const skipped = [];
    let rowIndex = 0;
    let createdCount = 0;
    const rowsForInsert: Array<{
      rowNumber: number;
      data: z.infer<typeof importChunkSchema>["rows"][number];
    }> = [];

    for (const row of parsed.data.rows) {
      rowIndex += 1;
      rowsForInsert.push({ rowNumber: rowIndex, data: row });
    }

    for (const chunk of chunkArray(rowsForInsert, DB_WRITE_CHUNK_SIZE)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const createdLeads = await prisma.$transaction(async (tx) => {
          const inserted = await tx.lead.createManyAndReturn({
            data: chunk.map(({ data: row }) => ({
              tenantId: req.user!.tenantId,
              name: row.name,
              phone: row.phone,
              email: row.email,
              address: row.address,
              pincode: row.pincode,
              studentCasteCategory: row.studentCasteCategory,
              region: null,
              city: null,
              locality: row.locality ?? null,
              parentContact: row.parentContact,
              course: row.course,
              source: row.source,
              status: row.status,
              priority: row.priority,
              nextFollowUp: row.nextFollowUp ? new Date(row.nextFollowUp) : null,
              assignedTo: req.user?.role === Role.COUNSELOR ? req.user.id : null
            })),
            skipDuplicates: true,
            select: { id: true, tenantId: true }
          });

          if (req.user?.role === Role.COUNSELOR && inserted.length > 0) {
            await logLeadAssignmentChanges(
              tx,
              inserted.map((lead) => ({ ...lead, assignedTo: null })),
              req.user.id,
              {
                assignedBy: req.user.id,
                sourceModule: "bulk.import.csv.chunk",
                ipAddress: req.ip ?? null,
                userAgent: req.get("user-agent") ?? null
              }
            );
          }

          return inserted;
        });
        createdCount += createdLeads.length;
      } catch (error) {
        skipped.push({
          rowNumber: -1,
          name: "Chunk",
          reason: error instanceof Error ? error.message : "Chunk import failed"
        });
      }
    }

    invalidateDashboardSummaryCache(req.user!.tenantId);
    return res.status(201).json({
      message: `Imported ${createdCount} lead${createdCount === 1 ? "" : "s"} in this chunk`,
      createdCount,
      skippedCount: Math.max(0, rowsForInsert.length - createdCount) + skipped.length,
      created: [],
      skipped
    });
  })
);

router.patch(
  "/leads",
  asyncHandler(async (req, res) => {
    // ✅ CRITICAL: Extract leadIds first to do tenant check early
    const leadIds = req.body?.leadIds;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(404).json({ message: "No matching leads found" });
    }

    // ✅ CRITICAL: Check if ANY of these leads belong to this tenant (early access check)
    const accessibleWhere = buildAccessibleLeadWhere(leadIds, req.user!);
    const matchedLeads = await prisma.lead.findMany({
      where: accessibleWhere,
      select: { id: true, tenantId: true, assignedTo: true }
    });

    if (matchedLeads.length === 0) {
      return res.status(404).json({ message: "No matching leads found" });
    }

    // ✅ NOW validate the entire payload (after confirming user has access to leads)
    const parsed = bulkUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid bulk update payload",
        errors: parsed.error.flatten()
      });
    }

    const { updates, confirmReassignment } = parsed.data;

    if (
      req.user?.role === Role.COUNSELOR &&
      updates.assignedTo !== undefined &&
      updates.assignedTo !== req.user.id
    ) {
      return res.status(403).json({
        message: "Counselors can only assign leads to themselves"
      });
    }

    if (updates.assignedTo !== undefined && updates.assignedTo !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: updates.assignedTo },
        select: { id: true, tenantId: true, role: true }
      });

      if (
        !assignee ||
        assignee.tenantId !== req.user!.tenantId ||
        (assignee.role !== Role.ADMIN && assignee.role !== Role.TENANT_ADMIN && assignee.role !== Role.COUNSELOR)
      ) {
        return res.status(403).json({ message: "Assigned user is invalid" });
      }
    }

    const nonAssignmentUpdateData = {
      ...(updates.status !== undefined ? { status: updates.status } : {}),
      ...(updates.priority !== undefined ? { priority: updates.priority } : {}),
      ...(updates.nextFollowUp !== undefined
        ? { nextFollowUp: updates.nextFollowUp ? new Date(updates.nextFollowUp) : null }
        : {})
    };

    if (updates.assignedTo !== undefined) {
      try {
        assertAssignmentConfirmed(matchedLeads, updates.assignedTo, confirmReassignment);
      } catch (error) {
        if (error instanceof AssignmentConfirmationError) {
          return res.status(error.statusCode).json({
            message: error.message,
            requiresConfirmation: true,
            conflictCount: error.conflicts.length,
            conflicts: error.conflicts.slice(0, 25)
          });
        }
        throw error;
      }
    }

    const matchedLeadIds = matchedLeads.map((lead) => lead.id);
    const result = await prisma.$transaction(async (tx) => {
      const nonAssignmentKeys = Object.keys(nonAssignmentUpdateData);
      const nonAssignmentResult = nonAssignmentKeys.length > 0
        ? await tx.lead.updateMany({
            where: {
              id: { in: matchedLeadIds }
            },
            data: nonAssignmentUpdateData
          })
        : { count: matchedLeadIds.length };

      if (updates.assignedTo !== undefined) {
        await logLeadAssignmentChanges(tx, matchedLeads, updates.assignedTo, {
          assignedBy: req.user!.id,
          sourceModule: "bulk.leads.update",
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent") ?? null
        });

        const changedLeadIds = matchedLeads
          .filter((lead) => lead.assignedTo !== updates.assignedTo)
          .map((lead) => lead.id);

        if (changedLeadIds.length > 0) {
          await tx.lead.updateMany({
            where: {
              tenantId: req.user!.tenantId,
              id: { in: changedLeadIds }
            },
            data: { assignedTo: updates.assignedTo }
          });
        }
      }

      return nonAssignmentResult;
    });
    invalidateDashboardSummaryCache(req.user!.tenantId);

    return res.json({
      message: `Updated ${result.count} lead${result.count === 1 ? "" : "s"}`,
      updatedCount: matchedLeadIds.length,
      requestedCount: leadIds.length,
      ignoredCount: leadIds.length - matchedLeadIds.length
    });
  })
);

router.delete(
  "/leads/delete",
  asyncHandler(async (req, res) => {
    if (req.user?.role !== Role.TENANT_ADMIN && req.user?.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ message: "Only tenant admins can delete leads in bulk" });
    }

    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid bulk delete payload",
        errors: parsed.error.flatten()
      });
    }

    const leadIds = Array.from(new Set(parsed.data.leadIds));
    const result = await prisma.lead.deleteMany({
      where: {
        tenantId: req.user!.tenantId,
        id: { in: leadIds }
      }
    });
    invalidateDashboardSummaryCache(req.user!.tenantId);

    return res.json({
      message: "Leads deleted successfully",
      deletedCount: result.count,
      requestedCount: leadIds.length
    });
  })
);

router.post(
  "/export",
  asyncHandler(async (req, res) => {
    if (req.user?.role !== Role.TENANT_ADMIN) {
      return res.status(403).json({ message: "Only tenant admins can export leads" });
    }
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid export payload",
        errors: parsed.error.flatten()
      });
    }

    const validColumns = parsed.data.columns.filter((column): column is (typeof exportableColumns)[number] =>
      exportableColumns.includes(column as (typeof exportableColumns)[number])
    );

    if (validColumns.length === 0) {
      return res.status(400).json({ message: "No valid export columns selected" });
    }

    const where = {
      ...buildAccessibleLeadWhere(null, req.user!),
      ...(parsed.data.filters?.status ? { status: parsed.data.filters.status } : {}),
      ...(parsed.data.filters?.priority ? { priority: parsed.data.filters.priority } : {}),
      ...(parsed.data.filters?.assignedTo !== undefined
        ? { assignedTo: parsed.data.filters.assignedTo }
        : {})
    };

    const leads = await prisma.lead.findMany({
      where,
      select: await buildLeadSelect({
        includeAssignedCounselor: true,
        includeRemarks: false
      }),
      orderBy: { createdAt: "desc" }
    });

    const headerLabels: Record<(typeof exportableColumns)[number], string> = {
      sr_no: "sr_no",
      name: "name",
      phone: "phone",
      email: "email",
      address: "address",
      city: "district",
      locality: "locality",
      state: "state",
      pincode: "pincode",
      student_caste_category: "student_caste_category",
      parent_contact: "parent_contact",
      course: "course",
      source: "source",
      status: "status",
      priority: "priority",
      next_follow_up: "next_follow_up",
      assigned_counselor: "assigned_counselor",
      created_at: "created_at",
      updated_at: "updated_at"
    };

    const csvRows: Array<Array<string | number | null | undefined>> = [
      validColumns.map((column) => headerLabels[column])
    ];

    leads.forEach((lead, index) => {
      csvRows.push(
        validColumns.map((column) => {
          switch (column) {
            case "sr_no":
              return index + 1;
            case "name":
              return lead.name;
            case "phone":
              return lead.phone;
            case "email":
              return lead.email;
            case "address":
              return lead.address;
            case "city":
              return lead.city;
            case "locality":
              return lead.locality;
            case "state":
              return lead.region;
            case "pincode":
              return lead.pincode;
            case "student_caste_category":
              return lead.studentCasteCategory;
            case "parent_contact":
              return lead.parentContact;
            case "course":
              return lead.course;
            case "source":
              return lead.source;
            case "status":
              return lead.status;
            case "priority":
              return lead.priority;
            case "next_follow_up":
              return lead.nextFollowUp?.toISOString() ?? null;
            case "assigned_counselor":
              return lead.assignedCounselor?.name ?? null;
            case "created_at":
              return lead.createdAt.toISOString();
            case "updated_at":
              return lead.updatedAt.toISOString();
            default:
              return null;
          }
        })
      );
    });

    return res.json({
      filename: `guruverse-leads-${new Date().toISOString().slice(0, 10)}.csv`,
      totalRows: leads.length,
      csv: buildCsv(csvRows)
    });
  })
);

export default router;
