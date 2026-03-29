/**
 * LOAD TEST: 500 Leads Performance Check
 * 
 * What this tests:
 * 1. Can backend handle inserting 500 leads quickly?
 * 2. Can dashboard filter/display 500 leads without UI lag?
 * 3. What's the response time for pipeline queries?
 * 
 * Success criteria:
 * - Lead creation: < 2s per lead
 * - Dashboard load: < 1s with 500 leads
 * - Filter/sort: < 500ms
 * - Pipeline calculation: < 100ms
 * 
 * Run: npx tsx src/scripts/load-test.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PerformanceMetric {
  operation: string;
  duration: number;
  status: "✓" | "⚠️" | "❌";
}

const metrics: PerformanceMetric[] = [];

function recordMetric(operation: string, duration: number) {
  let status: "✓" | "⚠️" | "❌" = "✓";

  // Performance thresholds
  const thresholds: Record<string, number> = {
    "create-lead": 50, // ms per lead
    "get-pipeline": 200,
    "filter-by-status": 300,
    "count-by-priority": 150,
    "get-activities": 500,
  };

  const threshold = thresholds[operation] || 1000;

  if (duration > threshold * 2) {
    status = "❌"; // Critical
  } else if (duration > threshold) {
    status = "⚠️"; // Warning
  }

  metrics.push({ operation, duration, status });
  console.log(
    `  ${status} ${operation.padEnd(20)} ${duration.toFixed(0).padStart(5)}ms`
  );
}

async function runLoadTest() {
  console.log("\n\n🚀 LOAD TEST: 500 Leads Performance\n");
  console.log("=".repeat(60));
  console.log("Target: Measure performance at scale\n");

  try {
    // Get or create counselor
    let counselor = await prisma.user.findFirst({
      where: { email: "load-test@crm.com" },
    });

    if (!counselor) {
      counselor = await prisma.user.create({
        data: {
          email: "load-test@crm.com",
          password: "hashed",
          name: "Load Test Counselor",
          role: "COUNSELOR",
        },
      });
    }

    // ===== BENCHMARK 1: Lead Insertion Speed =====
    console.log("\n📌 Benchmark 1: Creating 500 leads...\n");

    const createStartTime = Date.now();
    const leadIds: string[] = [];

    for (let i = 0; i < 500; i++) {
      const leadStart = Date.now();

      const lead = await prisma.lead.create({
        data: {
          name: `Load Test Lead ${i + 1}`,
          phone: `+919999${String(i).padStart(6, "0")}`,
          email: `load-test-${i}@example.com`,
          status: "LEAD",
          priority: i % 3 === 0 ? "HOT" : i % 3 === 1 ? "WARM" : "COLD",
          assignedToId: counselor.id,
        },
      });

      leadIds.push(lead.id);
      const leadDuration = Date.now() - leadStart;

      if (i % 50 === 0) {
        recordMetric(`create-lead (${i})`, leadDuration);
      }

      if (i % 100 === 0) {
        const avgSoFar = (Date.now() - createStartTime) / (i + 1);
        console.log(
          `    ... ${i + 1}/500 leads (${avgSoFar.toFixed(0)}ms avg)`
        );
      }
    }

    const createDuration = Date.now() - createStartTime;
    console.log(`  ✓ Total time: ${createDuration.toFixed(0)}ms`);
    console.log(`  ✓ Average: ${(createDuration / 500).toFixed(2)}ms per lead\n`);

    if (createDuration / 500 > 100) {
      console.log("  ⚠️  WARNING: Lead creation is slow");
      console.log(`     Expected: <50ms per lead`);
      console.log(`     Actual: ${(createDuration / 500).toFixed(2)}ms\n`);
    }

    // ===== BENCHMARK 2: Dashboard Load (Get All Leads) =====
    console.log("📌 Benchmark 2: Dashboard performance...\n");

    const getStartTime = Date.now();
    const allLeads = await prisma.lead.findMany({
      include: { activities: { take: 1, orderBy: { createdAt: "desc" } } },
      take: 100, // Usually paginated
    });
    const getDuration = Date.now() - getStartTime;

    recordMetric("get-pipeline", getDuration);

    if (getDuration > 1000) {
      console.log(
        "  ❌ CRITICAL: Dashboard is slow with 500 leads"
      );
      console.log(`     ${getDuration}ms to fetch first 100 leads`);
    }

    // ===== BENCHMARK 3: Status Filtering =====
    console.log("\n📌 Benchmark 3: Filtering by status...\n");

    for (const status of ["LEAD", "CONTACTED", "INTERESTED"]) {
      const filterStart = Date.now();
      const filtered = await prisma.lead.findMany({
        where: { status },
        take: 50,
      });
      const filterDuration = Date.now() - filterStart;

      recordMetric(`filter-by-status (${status})`, filterDuration);
    }

    // ===== BENCHMARK 4: Priority Analysis =====
    console.log("\n📌 Benchmark 4: Pipeline analytics...\n");

    const priorityStart = Date.now();
    const byPriority = await prisma.lead.groupBy({
      by: ["priority"],
      _count: true,
    });
    const priorityDuration = Date.now() - priorityStart;

    recordMetric("count-by-priority", priorityDuration);
    console.log("\n    Breakdown:");
    for (const p of byPriority) {
      console.log(`      - ${p.priority}: ${p._count} leads`);
    }

    // ===== BENCHMARK 5: Activity Queries =====
    console.log("\n📌 Benchmark 5: Activity queries...\n");

    const activityStart = Date.now();
    const activities = await prisma.activity.findMany({
      where: { leadId: { in: leadIds.slice(0, 10) } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const activityDuration = Date.now() - activityStart;

    recordMetric("get-activities", activityDuration);

    // ===== BENCHMARK 6: UI Responsiveness Simulation =====
    console.log("\n📌 Benchmark 6: Concurrent queries (UI responsiveness)...\n");

    const concurrentStart = Date.now();

    // Simulate simultaneous dashboard requests
    const concurrentQueries = Promise.all([
      prisma.lead.count(),
      prisma.lead.groupBy({ by: ["status"], _count: true }),
      prisma.lead.groupBy({ by: ["priority"], _count: true }),
      prisma.activity.count(),
    ]);

    await concurrentQueries;
    const concurrentDuration = Date.now() - concurrentStart;

    recordMetric("concurrent-dashboard-queries", concurrentDuration);

    if (concurrentDuration > 500) {
      console.log(
        "  ⚠️  WARNING: Dashboard might feel sluggish under load"
      );
    }

    // ===== PERFORMANCE SUMMARY =====
    console.log("\n" + "=".repeat(60));
    console.log("📊 PERFORMANCE SUMMARY\n");

    const successful = metrics.filter((m) => m.status === "✓").length;
    const warnings = metrics.filter((m) => m.status === "⚠️").length;
    const critical = metrics.filter((m) => m.status === "❌").length;

    console.log(`✓ Excellent: ${successful}`);
    console.log(`⚠️  Warning:  ${warnings}`);
    console.log(`❌ Critical: ${critical}\n`);

    console.log("📈 Detailed Results:\n");
    for (const m of metrics) {
      console.log(`${m.status} ${m.operation.padEnd(30)} ${m.duration.toFixed(0).padStart(6)}ms`);
    }

    // ===== RECOMMENDATIONS =====
    console.log("\n" + "=".repeat(60));
    console.log("💡 OPTIMIZATION RECOMMENDATIONS\n");

    if (createDuration / 500 > 50) {
      console.log("1. ⚡ Lead Creation");
      console.log("   - Add database indexes on (phone, email)");
      console.log("   - Implement batch insert for bulk operations");
      console.log("   - Consider async queue for lead processing\n");
    }

    if (getDuration > 500) {
      console.log("2. 📊 Dashboard Performance");
      console.log("   - Add pagination (currently fetching all)");
      console.log("   - Index (assignedToId, status) for filters");
      console.log("   - Use SELECT to fetch only needed fields\n");
    }

    if (concurrentDuration > 500) {
      console.log("3. 🔄 Concurrent Operations");
      console.log("   - Implement query caching (Redis)");
      console.log("   - Add database connection pooling");
      console.log("   - Consider read replicas for reporting\n");
    }

    console.log("4. 🎯 Frontend Optimization");
    console.log("   - Implement infinite scroll (not load all)");
    console.log("   - Add loading states and skeletons");
    console.log("   - Debounce filter/search inputs");
    console.log("   - Cache lead data client-side\n");

    console.log("=".repeat(60) + "\n");

    // Cleanup
    console.log("🧹 Cleaning up test data...");
    await prisma.activity.deleteMany({
      where: { lead: { assignedToId: counselor.id } },
    });
    await prisma.lead.deleteMany({
      where: { assignedToId: counselor.id },
    });
    console.log("✓ Test data removed\n");
  } catch (error) {
    console.error("❌ Load test error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runLoadTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
