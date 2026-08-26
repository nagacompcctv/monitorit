/**
 * Firestore -> PostgreSQL Migration Script
 * 
 * Usage:
 *   1. Export from Firestore:
 *      FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json \
 *      npx tsx scripts/migrate-firestore.ts export
 * 
 *   2. Import to PostgreSQL:
 *      DATABASE_URL="postgresql://..." \
 *      npx tsx scripts/migrate-firestore.ts import
 * 
 *   3. Full migration (export + import):
 *      FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json \
 *      DATABASE_URL="postgresql://..." \
 *      npx tsx scripts/migrate-firestore.ts migrate
 */

import admin from 'firebase-admin';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import * as schema from '../server/db/schema.js';
import fs from 'fs';
import path from 'path';

// Firestore collection names that map to `documents` table
const DOCUMENT_COLLECTIONS = [
  'tasks',
  'assets',
  'cctv-installations',
  'daily-reports',
  'locations',
  'asset_categories',
  'companies',
  'hardware_types',
  'topology',
  'servers',
  'domains',
  'organization',
];

const EXPORT_FILE = path.join(process.cwd(), 'firestore-export.json');

// Initialize Firebase Admin
function initFirebase(): admin.firestore.Firestore {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!keyPath) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_KEY env var to path of serviceAccountKey.json');
  }

  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.firestore();
}

// Export all Firestore collections to JSON
async function exportFromFirestore() {
  console.log('🔍 Connecting to Firestore...');
  const firestore = initFirebase();

  const exportData: Record<string, any[]> = {};

  // Export users
  console.log('📦 Exporting users...');
  const usersSnap = await firestore.collection('users').get();
  exportData.users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`   Found ${exportData.users.length} users`);

  // Export other collections
  for (const colName of DOCUMENT_COLLECTIONS) {
    console.log(`📦 Exporting ${colName}...`);
    const snap = await firestore.collection(colName).get();
    exportData[colName] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`   Found ${exportData[colName].length} documents`);
  }

  // Save to file
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Export saved to ${EXPORT_FILE}`);

  // Summary
  console.log('\n📊 Summary:');
  let total = 0;
  for (const [col, docs] of Object.entries(exportData)) {
    console.log(`   ${col}: ${docs.length} documents`);
    total += docs.length;
  }
  console.log(`   TOTAL: ${total} documents`);
}

// Import JSON to PostgreSQL
async function importToPostgreSQL() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('Set DATABASE_URL env var');
  }

  console.log('📦 Reading export file...');
  if (!fs.existsSync(EXPORT_FILE)) {
    throw new Error(`Export file not found: ${EXPORT_FILE}\nRun "export" first.`);
  }

  const exportData: Record<string, any[]> = JSON.parse(fs.readFileSync(EXPORT_FILE, 'utf8'));

  console.log('🔌 Connecting to PostgreSQL...');
  const pool = new pg.Pool({ connectionString: dbUrl });
  const db = drizzle(pool, { schema });

  // Create tables if not exist
  console.log('🔨 Ensuring tables exist...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      wa_number TEXT,
      performance_score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      collection_name TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Import users
  if (exportData.users) {
    console.log(`👤 Importing ${exportData.users.length} users...`);
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    for (const user of exportData.users) {
      const id = user.id || user.uid;
      const passwordHash = user.passwordHash || user.password_hash || defaultPasswordHash;

      await pool.query(`
        INSERT INTO users (id, name, email, password_hash, role, department, wa_number, performance_score, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          wa_number = EXCLUDED.wa_number,
          performance_score = EXCLUDED.performance_score
      `, [
        id,
        user.name || '',
        user.email || '',
        passwordHash,
        user.role || 'staff_software',
        user.department || null,
        user.wa_number || null,
        user.performance_score || 0,
        user.created_at ? new Date(user.created_at) : new Date(),
      ]);
      console.log(`   ✅ ${user.email || id}`);
    }
  }

  // Import other collections to documents table
  for (const colName of DOCUMENT_COLLECTIONS) {
    const docs = exportData[colName] || [];
    if (docs.length === 0) {
      console.log(`📄 Skipping ${colName} (empty)`);
      continue;
    }

    console.log(`📄 Importing ${docs.length} documents to "${colName}"...`);
    for (const doc of docs) {
      const id = doc.id;
      const data = { ...doc };
      delete data.id; // Remove id from data since it's the primary key

      // Clean up Firestore-specific fields
      delete data._fieldsProto;
      delete data._ref;

      await pool.query(`
        INSERT INTO documents (id, collection_name, data, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          data = EXCLUDED.data,
          updated_at = NOW()
      `, [
        id,
        colName,
        JSON.stringify(data),
        doc.created_at ? new Date(doc.created_at) : new Date(),
        doc.updated_at ? new Date(doc.updated_at) : new Date(),
      ]);
    }
    console.log(`   ✅ ${docs.length} documents imported`);
  }

  await pool.end();
  console.log('\n✅ Import complete!');
}

// Main
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'export':
      await exportFromFirestore();
      break;
    case 'import':
      await importToPostgreSQL();
      break;
    case 'migrate':
      await exportFromFirestore();
      await importToPostgreSQL();
      break;
    default:
      console.log(`
Firestore -> PostgreSQL Migration Tool

Usage:
  npx tsx scripts/migrate-firestore.ts export    Export Firestore to JSON
  npx tsx scripts/migrate-firestore.ts import    Import JSON to PostgreSQL  
  npx tsx scripts/migrate-firestore.ts migrate   Export + Import

Environment Variables:
  FIREBASE_SERVICE_ACCOUNT_KEY  Path to serviceAccountKey.json
  DATABASE_URL                  PostgreSQL connection string
      `);
  }
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
