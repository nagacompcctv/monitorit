# MonitorIT - IT Asset Management

Sistem manajemen aset IT untuk monitoring infrastruktur, CCTV, server, dan aset perusahaan.

## Fitur Utama

- **Dashboard** - Ringkasan aset dan aktivitas
- **Asset Management** - Manajemen aset hardware & software
- **CCTV Monitoring** - Monitoring instalasi CCTV
- **Server Monitoring** - Monitoring server & virtual machine
- **Daily Reports** - Laporan harian aktivitas IT
- **Maintenance** - Jadwal maintenance perangkat
- **User Management** - Manajemen pengguna & role

## Jalankan Lokal

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`

2. Set environment variables di `.env`:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   GEMINI_API_KEY=your_gemini_api_key
   PORT=3001
   ```

3. Run the app:
   `npm run dev`

## Deploy dengan Docker

```bash
docker compose up -d --build
```

Aplikasi akan berjalan di port 3001.
