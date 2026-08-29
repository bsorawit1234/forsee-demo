# Foresee Corp - Reservation & Real-Time Monitoring System
## Comprehensive System Specification & Requirements Blueprint

---

## 1. Context & Business Overview

- **Company Name**: Foresee Corporation Co., Ltd. (บริษัท ฟอร์ซี คอร์ปอเรชั่น จำกัด)
- **Website Reference**: [http://foresee-corp.com/](http://foresee-corp.com/)
- **Domain**: Industrial Waste Management, Environmental Services, Wastewater Treatment, Pond Cleaning, Dewatering Tubes & Waste Transportation.
- **Project Goal**: Develop a **Self-Service Customer Booking & Real-Time Owner Monitoring System** demo designed to streamline fleet dispatch, customer self-service booking, and operational oversight.

---

## 2. Problem Statement & System Solutions

| Current Industry Challenge | How Our System Solves It |
|---|---|
| **Manual Booking Friction**: Customers must phone or email to schedule industrial waste pickup or pond cleaning. | **Self-Service Customer Portal**: Interactive booking calendar where customers select service type, vehicle requirement (e.g., vacuum truck, sludge car), date, and time slot. |
| **Lack of Operational Visibility**: Company owners/managers lack real-time visibility into active jobs and vehicle statuses. | **Owner Central Monitoring Dashboard**: A live command center powered by WebSockets/SSE to track active jobs, stage history, and fleet utilization in real-time. |
| **Disjointed Team Workflow**: Drivers and field staff lack an easy tool to receive assignments and update job progress on the go. | **Driver/Employee Mobile Web View**: Role-tailored interface for employees to view assigned jobs and advance job stages (*Dispatched → Arrived → Collecting → Completed*). |
| **Missing Audit Trail**: Difficult to track historical execution details for compliance and billing. | **Audit & Workflow History Engine**: Immutable timeline recording every state transition, timestamp, responsible user, and notes/photos. |

---

## 3. System Features by Role

### 3.1 Customer Portal (Self-Service)
- **Service & Fleet Catalog**: Browse environmental services (Waste Removal, Tank/Pond Cleaning, Sludge Dewatering) and required equipment/vehicles.
- **Interactive Booking Calendar**: Select location, preferred date, available time slot, and volume/capacity requirements.
- **My Bookings Dashboard**: View status of upcoming and past service requests with live stage indicators.

### 3.2 Employee / Driver Portal
- **Assigned Jobs List**: Daily schedule view of assigned collection runs.
- **Stage Action Controls**: One-tap progress updates (*Start Route → Arrived at Site → Waste Loaded → Waste Disposed*).
- **Proof of Work Attachment**: Ability to attach completion photos and job notes.

### 3.3 Admin Portal
- **Fleet & Driver Management**: Manage trucks, driver assignments, and vehicle status (Available, Maintenance, In-Use).
- **Service Configuration**: Set up available time slots, service categories, and capacity rules.
- **Booking Overrides & Dispatching**: Manually adjust schedules, reassign drivers, or handle emergency requests.

### 3.4 Owner Central Monitoring Dashboard (Highlight Feature)
- **Live Operations Kanban / Fleet Grid**: Real-time status cards showing every job's current stage today.
- **Live WebSocket/SSE Updates**: Instant visual update whenever a driver changes job status.
- **Detailed History & Inspection Modal**: Drill down into any job to view complete audit trail, timestamps, and notes.
- **Executive Metrics Widget**: Daily summary of total bookings, active trucks, completed jobs, and overdue SLAs.

---

## 4. Workflow State Machine

```
[ Customer Books Slot ] 
         │
         ▼
     ( PENDING ) ──► [ Admin Assigns Driver/Vehicle ]
         │
         ▼
    ( DISPATCHED ) ──► [ Driver Starts Route ]
         │
         ▼
    ( IN_PROGRESS ) ──► [ Driver Completes Work & Uploads Proof ]
         │
         ▼
     ( COMPLETED ) ──► [ Billing & History Archival ]
         │
         ▼
    ( CANCELLED ) ── ( Optional Admin / Customer Action )
```

---

## 5. Technical Architecture Blueprint
*(Based on `TECH_STACK_ARCHITECTURE_HANDOFF.md`)*

- **Architecture Model**: TypeScript Monorepo + Modular Monolith API + Real-Time Background Worker
- **Frontend App**: React 19 + Vite + Tailwind CSS (Rich modern dark theme with responsive dashboards)
- **Backend API**: NestJS (REST + WebSockets for real-time dashboard events)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Queue / Background Jobs**: Redis + BullMQ (Notification dispatches, background processing)
- **Data Scoping & Security**: Role-Based Access Control (RBAC) separating Customer, Employee, Admin, and Owner capabilities.

---

## 6. Next Steps & Execution Roadmap

1. **Phase 1: Project Scaffolding**
   - Initialize pnpm monorepo workspace.
   - Scaffold NestJS backend, React frontend, and shared contract packages.
2. **Phase 2: Database Schema & Auth Setup**
   - Implement Prisma schema for Users, Roles, Services, Fleet, Bookings, and Workflow Logs.
   - Implement JWT / Session authentication.
3. **Phase 3: Core Features & Real-Time Engine**
   - Build Customer Booking Calendar interface.
   - Implement Driver Stage Updater.
   - Develop WebSockets gateway for Owner Real-Time Monitoring Dashboard.
4. **Phase 4: Polish & Handoff**
   - Apply modern aesthetic design system (glassmorphism, vibrant operational indicators).
   - End-to-end verification and demonstration readiness.
