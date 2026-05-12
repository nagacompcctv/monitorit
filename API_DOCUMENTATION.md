# API Endpoints & Webhooks - Apex IT Mastery

## Internal Webhooks (WhatsApp Gateway)
The system will "POST" to the existing WhatsApp API server with the following payloads:

### 1. Trigger Daily Summary
- **Endpoint**: `POST /api/wa/daily-summary`
- **Payload**:
```json
{
  "to": "whatsapp_number",
  "message": "*Daily Summary for {Date}*\nStaff: {Name}\nTasks: {CompletedCount}\nNext: {PendingTasks}"
}
```

### 2. Real-time Progress Update
- **Endpoint**: `POST /api/wa/progress-alert`
- **Payload**:
```json
{
  "to": "whatsapp_number",
  "message": "*Timeline Progress Update*\nTask: {TaskTitle}\nStatus: {Status}\nProgress: {Progress}%\nNote: {ManagerComment}"
}
```

### 3. Weekly Performance Report
- **Endpoint**: `POST /api/wa/weekly-performance`
- **Payload**:
```json
{
  "to": "whatsapp_number",
  "message": "*Weekly Performance Report*\nStaff: {Name}\nEfficiency: {Score}%\nReview: {AI_Summary}"
}
```

## Performance & Export Endpoints
- `GET /api/export/ppt?period=weekly&userId=...`
- `POST /api/tasks/approval` (Triggers WA and Updates Firestore)
