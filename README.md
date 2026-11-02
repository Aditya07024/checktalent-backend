# CheckTalent / TalentLens API Backend

AI-powered developer intelligence and candidate evaluation backend service built with **NestJS**, **Firebase Authentication**, and **Supabase (PostgreSQL)**.

---

## Architecture & Technology Stack

- **Framework:** NestJS 12 + Express platform (TypeScript ESM)
- **Database:** Supabase PostgreSQL (`@supabase/supabase-js`)
- **Authentication:** Firebase Admin SDK (token validation & identity verification)
- **Role & Dashboard Management:** Permanent role lock & custom role-based dashboards (`student`, `offcampus`, `campus`)
- **Validation:** `class-validator` & `class-transformer`

---

## Quick Start

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure the following variables are present:
```env
PORT=4000
FRONTEND_URL=http://localhost:3000

# Supabase Credentials
SUPABASE_URL=https://ttzmcpvffmicmhbaadfb.supabase.co
SUPABASE_ANON_KEY=sb_publishable_DZo-IlPuHbnvhEpbVHZdIg_xLExqKus
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key_here

# Firebase Admin Credentials
FIREBASE_PROJECT_ID=checktalent-85fbf
FIREBASE_CLIENT_EMAIL=your-service-account-email@checktalent-85fbf.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Apply Supabase Database Schema
Open [Supabase SQL Editor](https://supabase.com/dashboard) and run the SQL in:
```bash
supabase-schema.sql
```
This provisions `users`, `dashboard_metrics`, `candidate_evaluations`, `job_postings`, and `campus_drives` tables with appropriate indexes and RLS policies.

### 3. Install & Start Backend
```bash
npm install
npm run start:dev
```
The server will start at `http://localhost:4000/api`.

---

## API Endpoints

### Health & Integrations
- `GET /api/health` - Check API uptime, Supabase connection status, and Firebase Admin status.

### User Profiles & Dashboard Roles
- `GET /api/users/profile` (Protected with `Bearer <firebase_token>`) - Fetch caller profile and assigned role.
- `POST /api/users/assign-role` (Protected with `Bearer <firebase_token>`) - Permanently lock & assign role (`student`, `offcampus`, or `campus`).
- `PATCH /api/users/profile` (Protected with `Bearer <firebase_token>`) - Update user metadata (institution, headline, target role, etc.).

### Role-Based Dashboards
- `GET /api/dashboard` (Protected) - Fetch personalized user metrics, recent activities, and quick actions based on their assigned role.
- `GET /api/dashboard/overview/:role` (Public) - Fetch sample dashboard metrics for role preview.
- `POST /api/dashboard/metrics` (Protected) - Synchronize custom dashboard KPI widgets to Supabase.
