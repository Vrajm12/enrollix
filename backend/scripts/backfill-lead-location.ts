import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATE_TO_CITIES: Record<string, string[]> = {
  Maharashtra: ["Ahmednagar", "Akola", "Amravati", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Chhatrapati Sambhajinagar", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Dharashiv", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal", "Aurangabad", "Osmanabad"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
  Karnataka: ["Bengaluru", "Bangalore", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Ballari", "Davanagere"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli", "Erode", "Tirunelveli"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Mahbubnagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi", "Prayagraj", "Agra", "Meerut", "Gorakhpur"],
  Rajasthan: ["Jaipur", "Udaipur", "Jodhpur", "Kota", "Ajmer", "Bikaner", "Alwar"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior", "Jabalpur", "Ujjain", "Sagar"],
  "West Bengal": ["Kolkata", "Howrah", "Siliguri", "Durgapur", "Asansol", "Kharagpur"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur", "Puri", "Berhampur"],
  Kerala: ["Thiruvananthapuram", "Trivandrum", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur"],
  Delhi: ["Delhi", "New Delhi"],
  Haryana: ["Gurugram", "Gurgaon", "Faridabad", "Panipat", "Ambala", "Hisar", "Karnal"],
  Chandigarh: ["Chandigarh"]
};

const CITY_TO_STATE: Record<string, string> = Object.entries(STATE_TO_CITIES).reduce(
  (acc, [state, cities]) => {
    for (const city of cities) acc[city.toLowerCase()] = state;
    return acc;
  },
  {} as Record<string, string>
);

const normalizePincode = (value: string | null | undefined) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return digits.slice(0, 6);
};

const inferStateFromPincode = (pincode: string | null) => {
  if (!pincode) return null;
  const prefix = Number(pincode.slice(0, 2));
  if (prefix >= 11 && prefix <= 28) return "Delhi";
  if (prefix >= 30 && prefix <= 34) return "Rajasthan";
  if (prefix >= 36 && prefix <= 39) return "Gujarat";
  if (prefix >= 40 && prefix <= 44) return "Maharashtra";
  if (prefix >= 45 && prefix <= 48) return "Madhya Pradesh";
  if (prefix >= 50 && prefix <= 53) return "Andhra Pradesh";
  if (prefix >= 56 && prefix <= 59) return "Karnataka";
  if (prefix >= 60 && prefix <= 64) return "Tamil Nadu";
  if (prefix >= 67 && prefix <= 69) return "Kerala";
  if (prefix >= 70 && prefix <= 74) return "West Bengal";
  if (prefix >= 75 && prefix <= 77) return "Odisha";
  if (prefix >= 80 && prefix <= 85) return "Bihar";
  return null;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const tenantArg = args.find((arg) => arg.startsWith("--tenantId="));
  const tenantId = tenantArg ? Number(tenantArg.split("=")[1]) : undefined;
  return Number.isFinite(tenantId) ? tenantId : undefined;
};

async function main() {
  const tenantId = parseArgs();
  const where = tenantId ? { tenantId } : {};
  const leads = await prisma.lead.findMany({
    where,
    select: { id: true, city: true, region: true, pincode: true, address: true }
  });

  let updated = 0;

  for (const lead of leads) {
    const city = lead.city?.trim() || null;
    const extractedPin = normalizePincode(lead.pincode) ?? normalizePincode(lead.address ?? null);
    const inferredRegion =
      lead.region?.trim() ||
      (city ? CITY_TO_STATE[city.toLowerCase()] ?? null : null) ||
      inferStateFromPincode(extractedPin);

    const nextData = {
      pincode: extractedPin,
      region: inferredRegion ? inferredRegion : lead.region
    };

    const changed = (nextData.pincode ?? null) !== (lead.pincode ?? null) || (nextData.region ?? null) !== (lead.region ?? null);
    if (!changed) continue;

    // eslint-disable-next-line no-await-in-loop
    await prisma.lead.update({
      where: { id: lead.id },
      data: nextData
    });
    updated += 1;
  }

  console.log(`Backfill complete. Updated ${updated} lead(s).`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
