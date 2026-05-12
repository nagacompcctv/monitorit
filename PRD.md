# Product Requirements Document (PRD) - Apex IT Mastery

## 1. Project Overview
Apex IT Mastery is a comprehensive management system designed for heads of IT divisions to monitor team progress, staff performance, and IT infrastructure assets. It bridges the gap between planned projects (Software) and reactive tickets (Hardware), providing real-time visibility and automated reporting.

## 2. User Roles & Scopes
- **IT Manager (Super Admin)**: Full visibility into all departments, assets, and reports.
- **Supervisor (Software - Business Process)**: Manages Business Analysts.
- **Project Manager (Software - Programmer)**: Manages Fullstack Programmers.
- **Admin Divisi IT**: Direct support to the IT Manager.
- **Hardware Team Staff**: Specialists in IT Support, Network/CCTV, and Industrial IoT.

## 3. Core Features
### 3.1 Activity & Timeline Tracker
- Real-time visibility of current tasks per staff.
- Visual timeline with progress percentage (%).
- Support for both **Planned Projects** (structured) and **Ad-hoc Tickets** (reactive).

### 3.2 Manager Follow-Up & Audit Trail
- Digital "Stamp Approval" and notes for staff logbooks.
- Automatic timestamping to serve as evidence for higher management (Directors).
- Negligence flagging: System marks tasks as "neglected" if staff ignores manager notes.

### 3.3 Staff Performance Dashboard
- Summary of capabilities and efficiency.
- Data-driven performance reviews based on daily activity logs.

### 3.4 Asset & Infrastructure Management
- **IT Assets**: Inventory of Laptops, PCs, HPs, TVs (Status, User, Location).
- **CCTV Management**: Database of cameras per location, HDD capacity, and retention periods.
- **ISP Management**: Tracking internet service providers per location.

### 3.5 Automated Reporting (One-Click PPT)
- Export weekly, monthly, and yearly reports to .pptx format.
- Modern, aesthetic templates ready for presentation to Stakeholders/Owners.

### 3.6 WhatsApp Integration
- Automatic notifications via internal WhatsApp Gateway.
- Daily summaries, real-time progress updates, and weekly performance reviews.

## 4. Non-Functional Requirements
- **UI/UX**: Clean, modern, "Master Control" aesthetic (referencing Design Recipe 1 & 11).
- **Responsiveness**: Optimized for desktop monitoring and tablet/mobile quick checks.
- **Reliability**: Real-time updates using Firestore listeners.
