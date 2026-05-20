import { pgTable, text, timestamp, jsonb, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull(),
  department: text('department'),
  wa_number: text('wa_number'),
  performance_score: integer('performance_score').default(0),
  created_at: timestamp('created_at').defaultNow(),
});

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  collectionName: text('collection_name').notNull(),
  data: jsonb('data').notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
