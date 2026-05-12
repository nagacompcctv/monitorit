# Database Schema Design - Apex IT Mastery

## Collections (Firestore)

### `users`
- `uid`: string (Primary Key)
- `name`: string
- `email`: string
- `role`: enum (head_of_it, administrator, it_admin, staff_software, staff_hardware)
- `department`: string (software, hardware)
- `sub_department`: string (business_process, programmer, support, network_cctv, iot)
- `specialties`: array<string>
- `performance_score`: number
- `wa_number`: string (for notifications)

### `tasks`
- `id`: string
- `title`: string
- `description`: string
- `assigned_to`: string (user_id)
- `type`: enum (project, adhoc)
- `status`: enum (todo, in_progress, review, completed, neglected)
- `progress`: number (0-100)
- `start_date`: timestamp
- `end_date`: timestamp
- `created_at`: timestamp
- `updated_at`: timestamp
- `manager_notes`: array<{ note: string, author_id: string, timestamp: timestamp, type: 'approval' | 'followup' }>
- `is_flagged`: boolean (if notes are ignored)

### `assets`
- `id`: string
- `type`: enum (laptop, pc, hp, tv)
- `serial_number`: string
- `model`: string
- `user_id`: string (owner)
- `location`: string
- `status`: enum (active, broken, maintenance, storage)

### `cctv_installations`
- `id`: string
- `location_name`: string
- `camera_count`: number
- `hdd_capacity_tb`: number
- `retention_days`: number
- `last_checked`: timestamp

### `isp_services`
- `id`: string
- `location`: string
- `provider_name`: string
- `bandwidth`: string
- `status`: string

### `daily_logs`
- `id`: string
- `user_id`: string
- `date`: string (YYYY-MM-DD)
- `content`: string (activity summary)
- `metrics`: { tasks_completed: number, hours_worked: number }
