import { prisma } from "./src/prisma.js";

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      include: { tenant: true }
    });
    
    console.log('\n📋 Users in database:');
    if (users.length === 0) {
      console.log('  ❌ NO USERS FOUND!');
    } else {
      users.forEach(u => {
        console.log(`  - ${u.email} (Tenant: ${u.tenant.name}, Role: ${u.role})`);
      });
    }
    
    const tenants = await prisma.tenant.findMany();
    console.log('\n📋 Tenants:');
    tenants.forEach(t => {
      console.log(`  - ${t.name} (slug: ${t.slug})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
