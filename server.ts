import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./server/db/schema.js";
import dotenv from "dotenv";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Init DB
  let db: ReturnType<typeof drizzle> | null = null;
  
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log("Connected to PostgreSQL");
  } else {
    console.warn("DATABASE_URL not set in .env! Database API will fail.");
  }

  // --- MOCK FIRESTORE API OVER POSTGRESQL ---

  // Auth Login
  app.post("/api/auth/login", async (req, res) => {
    if (!db) return res.status(500).json({ message: "Database not connected. Please configure DATABASE_URL." });
    try {
      const { email, password } = req.body;
      const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const pwdMatch = await bcrypt.compare(password, user.passwordHash);
      if (!pwdMatch) return res.status(401).json({ message: "Invalid credentials" });

      res.json({ token: "mock-jwt-token-for-now", user });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // Query Collections
  app.post("/api/db/query", async (req, res) => {
    if (!db) return res.status(500).json({ message: "Database not connected. Please configure DATABASE_URL." });
    try {
      const { path: colPath, constraints } = req.body as any;
      
      if (colPath === 'users') {
        const results = await db.select().from(schema.users);
        return res.json(results.map(u => ({ id: u.id, data: u })));
      }

      let reqConstraints = constraints || [];
      const results = await db.select().from(schema.documents).where(eq(schema.documents.collectionName, colPath));
      
      let docs = results.map(r => ({ id: r.id, data: r.data }));
      
      for (const c of reqConstraints) {
        if (c.type === 'where') {
          docs = docs.filter((d:any) => {
            const val = Array.isArray(d.data) ? undefined : d.data[c.field];
            if (c.op === '==') return val == c.value;
            if (c.op === '<') return val < c.value;
            if (c.op === '>') return val > c.value;
            if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.value);
            return true;
          });
        }
        if (c.type === 'orderBy') {
          docs.sort((a:any, b:any) => {
            const va = a.data[c.field];
            const vb = b.data[c.field];
            if (va < vb) return c.direction === 'asc' ? -1 : 1;
            if (va > vb) return c.direction === 'asc' ? 1 : -1;
            return 0;
          });
        }
        if (c.type === 'limit') {
          docs = docs.slice(0, c.value);
        }
      }

      res.json(docs);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // Get Single Doc
  app.get("/api/db/doc/:col/:id", async (req, res) => {
    if (!db) return res.status(500).json({ message: "Database not connected. Please configure DATABASE_URL." });
    try {
      const { col, id } = req.params;
      
      if (col === 'users') {
        const [doc] = await db.select().from(schema.users).where(eq(schema.users.id, id));
        if (!doc) return res.status(404).json({ error: 'not found' });
        return res.json({ id: doc.id, data: doc });
      }

      const [doc] = await db.select().from(schema.documents).where(and(
        eq(schema.documents.collectionName, col),
        eq(schema.documents.id, id)
      ));
      if (!doc) return res.status(404).json({ error: 'not found' });
      res.json({ id: doc.id, data: doc.data });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // PUT single doc
  app.put("/api/db/doc/:col/:id", async (req, res) => {
    if (!db) return res.status(500).json({ message: "Database not connected. Please configure DATABASE_URL." });
    try {
      const { col, id } = req.params;
      const data = req.body;
      
      if (col === 'users') {
        const existing = await db.select().from(schema.users).where(eq(schema.users.id, id));
        if (existing.length === 0) {
           await db.insert(schema.users).values({ id, ...data });
        } else {
           await db.update(schema.users).set(data).where(eq(schema.users.id, id));
        }
        return res.json({ success: true });
      }

      const [existing] = await db.select().from(schema.documents).where(and(
        eq(schema.documents.collectionName, col),
        eq(schema.documents.id, id)
      ));

      if (existing) {
        await db.update(schema.documents).set({ data, updated_at: new Date() }).where(eq(schema.documents.id, id));
      } else {
        await db.insert(schema.documents).values({ id, collectionName: col, data });
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // PATCH single doc (partial update)
  app.patch("/api/db/doc/:col/:id", async (req, res) => {
    if (!db) return res.status(500).json({ message: "Database not connected. Please configure DATABASE_URL." });
    try {
      const { col, id } = req.params;
      const partialData = req.body;
      
      if (col === 'users') {
        await db.update(schema.users).set(partialData).where(eq(schema.users.id, id));
        return res.json({ success: true });
      }

      const [existing] = await db.select().from(schema.documents).where(and(
        eq(schema.documents.collectionName, col),
        eq(schema.documents.id, id)
      ));

      if (existing) {
        const newData = { ...(existing.data as any), ...partialData };
        await db.update(schema.documents).set({ data: newData, updated_at: new Date() }).where(eq(schema.documents.id, id));
      } else {
        await db.insert(schema.documents).values({ id, collectionName: col, data: partialData });
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ message: e.message });
    }
  });

  // DELETE single doc
  app.delete("/api/db/doc/:col/:id", async (req, res) => {
    if (!db) return res.status(500).json({ message: "Database not connected. Please configure DATABASE_URL." });
    try {
      const { col, id } = req.params;
      if (col === 'users') {
        await db.delete(schema.users).where(eq(schema.users.id, id));
        return res.json({ success: true });
      }
      await db.delete(schema.documents).where(and(
        eq(schema.documents.collectionName, col),
        eq(schema.documents.id, id)
      ));
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ message: e.message });
    }
  });


  // Proxy route for WhatsApp API or any cross-origin requests
  app.post("/api/proxy", async (req, res) => {
    try {
      const { targetUrl, ...bodyPayload } = req.body;
      
      if (!targetUrl) {
        return res.status(400).json({ error: "targetUrl is required" });
      }

      console.log(`Proxying request to: ${targetUrl}`);
      
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.text();
      res.status(response.status).send(data);
    } catch (error: any) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
