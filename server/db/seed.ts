import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL not set. Skipping seed.");
    return;
  }
  
  console.log("Connecting...");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  const passwordHash = await bcrypt.hash('password123', 10);

  const roles = ['head_of_it', 'administrator', 'supervisor', 'manager', 'it_admin', 'staff_software', 'staff_hardware'];
  
  console.log("Clearing existing users...");
  await db.delete(schema.users);
  
  console.log("Inserting users...");
  let count = 1;
  for (const role of roles) {
    await db.insert(schema.users).values({
      id: `user-${count}`,
      name: `${role} User`,
      email: `${role.replace('_', '')}@company.com`,
      passwordHash,
      role: role,
      department: 'IT',
      wa_number: '62812345678',
      performance_score: 90
    });
    console.log(`Inserted ${role} User (${role.replace('_', '')}@company.com / password123)`);
    count++;
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(e => {
  console.error("Seed error:", e);
  process.exit(1);
});
