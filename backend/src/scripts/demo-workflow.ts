/**
 * DEMO WORKFLOW: Manual User Testing Script
 * 
 * What this does:
 * 1. Creates 20 leads (simulating real lead generation)
 * 2. Assigns them to counselors
 * 3. Simulates 3 days of follow-up activities
 * 4. Moves leads through pipeline stages
 * 5. Tests missed follow-ups, overdue alerts
 * 
 * This is meant to be run manually to test UX like a real user would
 * Run: npx tsx src/scripts/demo-workflow.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper functions
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(date: Date, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

// Sample lead data - realistic Indian education leads
const SAMPLE_LEADS = [
  { name: "Priya Singh", phone: "+919876543210", email: "priya@example.com" },
  { name: "Rajesh Kumar", phone: "+919876543211", email: "rajesh@example.com" },
  { name: "Ananya Sharma", phone: "+919876543212", email: "ananya@example.com" },
  { name: "Vikram Patel", phone: "+919876543213", email: "vikram@example.com" },
  { name: "Neha Desai", phone: "+919876543214", email: "neha@example.com" },
  { name: "Amit Gupta", phone: "+919876543215", email: "amit@example.com" },
  { name: "Sneha Nair", phone: "+919876543216", email: "sneha@example.com" },
  { name: "Arjun Reddy", phone: "+919876543217", email: "arjun@example.com" },
  { name: "Divya Iyer", phone: "+919876543218", email: "divya@example.com" },
  { name: "Rohan Bhat", phone: "+919876543219", email: "rohan@example.com" },
  { name: "Isha Chopra", phone: "+919876543220", email: "isha@example.com" },
  { name: "Karan Singh", phone: "+919876543221", email: "karan@example.com" },
  { name: "Pooja Jain", phone: "+919876543222", email: "pooja@example.com" },
  { name: "Suresh Rao", phone: "+919876543223", email: "suresh@example.com" },
  { name: "Megha Verma", phone: "+919876543224", email: "megha@example.com" },
  { name: "Nikhil Malhotra", phone: "+919876543225", email: "nikhil@example.com" },
  { name: "Alisha Khan", phone: "+919876543226", email: "alisha@example.com" },
  { name: "Sanjay Mishra", phone: "+919876543227", email: "sanjay@example.com" },
  { name: "Ritika Sharma", phone: "+919876543228", email: "ritika@example.com" },
  { name: "Harshit Verma", phone: "+919876543229", email: "harshit@example.com" },
];

async function runDemo() {
  console.log("\n🚀 DEMO WORKFLOW - Real User Testing\n");
  console.log("========================================");

  try {
    // Step 1: Get or create counselors
    console.log("\n📌 Step 1: Setting up counselors...");
    let counselor1 = await prisma.user.findFirst({
      where: { email: "counselor1@crm.com" },
    });

    if (!counselor1) {
      counselor1 = await prisma.user.create({
        data: {
          email: "counselor1@crm.com",
          password: "hashed_password",
          name: "Rajesh Kumar",
          role: "COUNSELOR",
        },
      });
      console.log(`✓ Created counselor: ${counselor1.name}`);
    }

    let counselor2 = await prisma.user.findFirst({
      where: { email: "counselor2@crm.com" },
    });

    if (!counselor2) {
      counselor2 = await prisma.user.create({
        data: {
          email: "counselor2@crm.com",
          password: "hashed_password",
          name: "Priya Sharma",
          role: "COUNSELOR",
        },
      });
      console.log(`✓ Created counselor: ${counselor2.name}`);
    }

    // Step 2: Create 20 leads
    console.log("\n📌 Step 2: Adding 20 leads...");
    const leads = [];
    for (let i = 0; i < SAMPLE_LEADS.length; i++) {
      const leadData = SAMPLE_LEADS[i];
      const counselor = i % 2 === 0 ? counselor1 : counselor2;

      const lead = await prisma.lead.create({
        data: {
          name: leadData.name,
          phone: leadData.phone,
          email: leadData.email,
          status: "LEAD",
          priority: "COLD",
          assignedTo: counselor.id,
        },
      });

      leads.push(lead);
      console.log(`  ${i + 1}. ${lead.name} (${lead.phone}) → ${counselor.name}`);
    }

    // Step 3: Simulate 3 days of activities
    console.log("\n📌 Step 3: Simulating 3 days of follow-up activities...");

    const now = new Date();
    let activityCount = 0;

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const dayDate = addDays(now, dayOffset);
      console.log(`\n  📅 Day ${dayOffset + 1} (${dayDate.toLocaleDateString()})`);

      // Add activities for first 15 leads
      for (let i = 0; i < Math.min(15, leads.length); i++) {
        const lead = leads[i];
        const activityTypes = ["CALL", "EMAIL", "NOTE", "WHATSAPP"];
        const activityType = activityTypes[i % activityTypes.length];

        // Create activity with follow-up
        const activity = await prisma.activity.create({
          data: {
            leadId: lead.id,
            type: activityType as any,
            notes: `${activityType} - Day ${dayOffset + 1} follow-up`,
            createdAt: addHours(dayDate, Math.random() * 8 + 9), // 9am-5pm
            nextFollowUp: dayOffset === 2 ? addDays(dayDate, 1) : addDays(dayDate, 1), // Next day
          },
        });

        activityCount++;

        // Random pipeline progression (20% chance)
        if (Math.random() < 0.2) {
          const stages = ["CONTACTED", "INTERESTED", "QUALIFIED"];
          const newStage = stages[Math.floor(Math.random() * stages.length)];

          const updatedLead = await prisma.lead.update({
            where: { id: lead.id },
            data: { status: newStage },
          });

          console.log(`    ✓ ${lead.name}: ${activityType} + moved to ${newStage}`);
        } else {
          console.log(`    ✓ ${lead.name}: ${activityType} logged`);
        }
      }
    }

    // Step 4: Create some MISSED follow-ups (simulate passing time on day 4)
    console.log("\n📌 Step 4: Simulating MISSED follow-ups (day 4)...");
    const dayFour = addDays(now, 4);

    // Some leads have follow-ups from day 3 that are now overdue
    for (let i = 0; i < 5; i++) {
      const lead = leads[i];

      // Update the last activity's follow-up to be in the past (missed)
      const lastActivity = await prisma.activity.findFirst({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
      });

      if (lastActivity) {
        await prisma.activity.update({
          where: { id: lastActivity.id },
          data: {
            nextFollowUp: addDays(now, -1), // Yesterday - now OVERDUE
          },
        });

        console.log(`  ⚠️  ${lead.name}: Follow-up OVERDUE (was due yesterday)`);
      }
    }

    // Step 5: Generate report
    console.log("\n📌 Step 5: Dashboard Statistics\n");

    const totalLeads = await prisma.lead.count();
    const byStatus = await prisma.lead.groupBy({
      by: ["status"],
      _count: true,
    });

    console.log(`📊 Total Leads: ${totalLeads}`);
    console.log("   Status Breakdown:");
    for (const group of byStatus) {
      console.log(
        `   - ${group.status}: ${group._count} leads (${((group._count / totalLeads) * 100).toFixed(0)}%)`
      );
    }

    // Follow-up status
    console.log("\n   Follow-up Status:");

    const overdue = await prisma.activity.findMany({
      where: {
        nextFollowUp: {
          lt: now,
        },
      },
      distinct: ["leadId"],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = addDays(today, 1);

    const todayFollowups = await prisma.activity.findMany({
      where: {
        AND: [
          { nextFollowUp: { gte: today } },
          { nextFollowUp: { lt: tomorrow } },
        ],
      },
      distinct: ["leadId"],
    });

    console.log(`   - 🔴 Overdue: ${overdue.length} leads`);
    console.log(`   - 🟠 Today: ${todayFollowups.length} leads`);
    console.log(`   - 🟢 Upcoming: ${totalLeads - overdue.length - todayFollowups.length} leads`);

    console.log(`\n✅ Total Activities Created: ${activityCount}`);
    console.log(
      "\n========================================\n✨ Demo complete! Now test manually:\n"
    );
    console.log("1. Open http://localhost:3000");
    console.log("2. Login with any Postman test user");
    console.log("3. Check the dashboard - see overdue alerts");
    console.log(
      "4. Click on leads - check activity timeline is in order"
    );
    console.log("5. Try moving a lead - is the UX smooth?");
    console.log("6. Try adding a follow-up - does it validate?");
    console.log("\n🔍 Look for:");
    console.log("   - Is follow-up date required? (Business critical)");
    console.log("   - Are activities in chronological order?");
    console.log("   - Is overdue highlighting clear?");
    console.log("   - Is the UI responsive or laggy?");
    console.log("   - Any confusing workflows?\n");
  } catch (error) {
    console.error("❌ Error during demo:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runDemo().catch((e) => {
  console.error(e);
  process.exit(1);
});
