import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

// All available collection tables in the database
const COLLECTION_TABLES = [
  'users', 'tasks', 'assets', 'cctv_installations', 'daily_reports',
  'locations', 'asset_categories', 'categories', 'companies',
  'hardware_types', 'servers', 'domains', 'organization', 'topology',
  'asset_histories', 'settings', 'system', 'firestore_docs',
  'mon_backup', 'mon_bizprocess', 'mon_email', 'mon_notifications',
  'mon_physical', 'mon_shared', 'mon_vm', 'user_departments'
];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());

  // Init DB
  let pool: pg.Pool | null = null;

  if (process.env.DATABASE_URL) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query('SELECT 1');
      console.log("✅ Connected to PostgreSQL");
    } catch (e: any) {
      console.error("❌ Database connection failed:", e.message);
    }
  } else {
    console.warn("DATABASE_URL not set in .env! Database API will fail.");
  }

  // Helper: extract id from doc
  function extractId(doc: any) {
    return doc?.id || doc?.data?.id || null;
  }

  // --- AUTH API ---

  // Auth Login
  app.post("/api/auth/login", async (req, res) => {
    if (!pool) return res.status(500).json({ message: "Database not connected." });
    try {
      const { email, password } = req.body;
      const result = await pool.query(
        `SELECT id, data FROM users WHERE data->>'email' = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: "User not found" });
      }

      const row = result.rows[0];
      const userData = row.data;
      const passwordHash = userData.password_hash || userData.passwordHash || userData.password;

      // For migration compatibility, accept plain text password comparison
      // if password is not hashed
      let pwdMatch = false;
      if (passwordHash && passwordHash.startsWith('$2')) {
        // bcrypt hash
        const bcrypt = await import('bcryptjs');
        pwdMatch = await bcrypt.compare(password, passwordHash);
      } else {
        // Plain text (legacy)
        pwdMatch = password === passwordHash;
      }

      if (!pwdMatch) return res.status(401).json({ message: "Invalid credentials" });

      const user = {
        uid: row.id,
        id: row.id,
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'staff_software',
        department: userData.department || '',
        wa_number: userData.wa_number || '',
        performance_score: userData.performance_score || 0,
      };

      res.json({ token: "mock-jwt-token-for-now", user });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // --- DB QUERY API ---

  // Query Collection
  app.post("/api/db/query", async (req, res) => {
    if (!pool) return res.status(500).json({ message: "Database not connected." });
    try {
      const { path: colPath, constraints } = req.body as any;

      // Map collection names to actual table names
      const tableName = colPath === 'daily-reports' ? 'daily_reports' :
                        colPath === 'asset_categories' ? 'categories' :
                        colPath === 'cctv-installations' ? 'cctv_installations' :
                        colPath === 'asset_histories' ? 'asset_histories' :
                        colPath;

      if (!COLLECTION_TABLES.includes(tableName)) {
        return res.json([]);
      }

      const result = await pool.query(
        `SELECT id, data, created_at, updated_at FROM "${tableName}" ORDER BY created_at DESC`
      );

      let docs = result.rows.map(r => ({
        id: r.id,
        data: r.data,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }));

      // Apply constraints
      if (constraints && constraints.length > 0) {
        for (const c of constraints) {
          if (c.type === 'where') {
            docs = docs.filter((d: any) => {
              const val = d.data?.[c.field];
              if (c.op === '==') return val == c.value;
              if (c.op === '===') return val === c.value;
              if (c.op === '<') return val < c.value;
              if (c.op === '>') return val > c.value;
              if (c.op === '<=') return val <= c.value;
              if (c.op === '>=') return val >= c.value;
              if (c.op === '!=') return val != c.value;
              if (c.op === 'array-contains') return Array.isArray(val) && val.includes(c.value);
              return true;
            });
          }
          if (c.type === 'orderBy') {
            docs.sort((a: any, b: any) => {
              const va = a.data?.[c.field];
              const vb = b.data?.[c.field];
              if (va < vb) return c.direction === 'asc' ? -1 : 1;
              if (va > vb) return c.direction === 'asc' ? 1 : -1;
              return 0;
            });
          }
          if (c.type === 'limit') {
            docs = docs.slice(0, c.value);
          }
        }
      }

      res.json(docs);
    } catch (e: any) {
      console.error("Query error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Get Single Doc
  app.get("/api/db/doc/:col/:id", async (req, res) => {
    if (!pool) return res.status(500).json({ message: "Database not connected." });
    try {
      const { col, id } = req.params;
      const tableName = col === 'daily-reports' ? 'daily_reports' :
                        col === 'asset_categories' ? 'categories' :
                        col;

      if (!COLLECTION_TABLES.includes(tableName)) {
        return res.status(404).json({ error: 'not found' });
      }

      const result = await pool.query(
        `SELECT id, data, created_at, updated_at FROM "${tableName}" WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'not found' });
      }

      const row = result.rows[0];
      res.json({ id: row.id, data: row.data });
    } catch (e: any) {
      console.error("GetDoc error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // PUT single doc
  app.put("/api/db/doc/:col/:id", async (req, res) => {
    if (!pool) return res.status(500).json({ message: "Database not connected." });
    try {
      const { col, id } = req.params;
      const data = req.body;
      const tableName = col === 'daily-reports' ? 'daily_reports' :
                        col === 'asset_categories' ? 'categories' :
                        col;

      if (!COLLECTION_TABLES.includes(tableName)) {
        return res.status(400).json({ error: `Unknown collection: ${col}` });
      }

      // Check if exists
      const existing = await pool.query(
        `SELECT id FROM "${tableName}" WHERE id = $1`, [id]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE "${tableName}" SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(data), id]
        );
      } else {
        await pool.query(
          `INSERT INTO "${tableName}" (id, data, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`,
          [id, JSON.stringify(data)]
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("PutDoc error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // PATCH single doc (partial update)
  app.patch("/api/db/doc/:col/:id", async (req, res) => {
    if (!pool) return res.status(500).json({ message: "Database not connected." });
    try {
      const { col, id } = req.params;
      const partialData = req.body;
      const tableName = col === 'daily-reports' ? 'daily_reports' :
                        col === 'asset_categories' ? 'categories' :
                        col;

      if (!COLLECTION_TABLES.includes(tableName)) {
        return res.status(400).json({ error: `Unknown collection: ${col}` });
      }

      const existing = await pool.query(
        `SELECT id, data FROM "${tableName}" WHERE id = $1`, [id]
      );

      if (existing.rows.length > 0) {
        const currentData = existing.rows[0].data || {};
        const newData = { ...currentData, ...partialData };
        await pool.query(
          `UPDATE "${tableName}" SET data = $1, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(newData), id]
        );
      } else {
        await pool.query(
          `INSERT INTO "${tableName}" (id, data, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`,
          [id, JSON.stringify(partialData)]
        );
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("PatchDoc error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // DELETE single doc
  app.delete("/api/db/doc/:col/:id", async (req, res) => {
    if (!pool) return res.status(500).json({ message: "Database not connected." });
    try {
      const { col, id } = req.params;
      const tableName = col === 'daily-reports' ? 'daily_reports' :
                        col === 'asset_categories' ? 'categories' :
                        col;

      if (!COLLECTION_TABLES.includes(tableName)) {
        return res.status(400).json({ error: `Unknown collection: ${col}` });
      }

      await pool.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error("DeleteDoc error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // Proxy route for WhatsApp API
  app.post("/api/proxy", async (req, res) => {
    try {
      const { targetUrl, ...bodyPayload } = req.body;
      if (!targetUrl) {
        return res.status(400).json({ error: "targetUrl is required" });
      }
      console.log(`Proxying request to: ${targetUrl}`);
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
