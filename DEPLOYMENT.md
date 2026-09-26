# StockSense — Production Deployment & Architecture Guide

> **Target Deployment Architecture**:  
> `GitHub Repository (Jilpatel18/Stock-Sense)` $\rightarrow$ `Vercel (Next.js 16 Serverless)` $\rightarrow$ `Neon PostgreSQL`

---

## 🏗️ 1. Architecture Overview

StockSense is an enterprise-grade Inventory Management System (IMS) designed with strict server-side transactional guarantees, role-based access control (RBAC), and immutable stock ledger logging.

```
   ┌────────────────────────────────────────────────────────┐
   │            GitHub Repository / Vercel Host             │
   │       (Next.js 16 App Router + Turbopack + Node.js)    │
   └──────────────────────────┬─────────────────────────────┘
                              │ HTTPS / JSON API
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │               Serverless Route Handlers                │
   │      (JWT Auth + DB Live Role Check + Sanitization)    │
   └──────────────────────────┬─────────────────────────────┘
                              │ Node Server Execution
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │               Inventory Service Engine                 │
   │       (validateReceipt, validateTransfer, etc.)        │
   └──────────────────────────┬─────────────────────────────┘
                              │ BEGIN ... COMMIT (FOR UPDATE)
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │                 Neon PostgreSQL DB Cluster             │
   │  ┌───────────────────┬──────────────────────────────┐  │
   │  │ inventory (Locked) │ stock_ledger (Immutable)     │  │
   │  ├───────────────────┼──────────────────────────────┤  │
   │  │ users & RBAC      │ audit_logs (Redacted)        │  │
   │  └───────────────────┴──────────────────────────────┘  │
   └────────────────────────────────────────────────────────┘
```

---

## ⚙️ 2. Environment Variables Matrix

| Environment Variable | Context | Required? | Description & Value Format |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Production & Local** | **Yes** | PostgreSQL Connection String (`postgres://user:pass@ep-host.neon.tech/neondb?sslmode=require`) |
| `JWT_SECRET` | **Production & Local** | **Yes** | Cryptographic secret ($\ge 32$ chars) used to sign/verify session JWT tokens. |
| `EMAIL_PROVIDER` | **Production & Local** | Optional | `"smtp"` for production live email dispatch, or `"console"` for sandbox logging. |
| `EMAIL_FROM` | **Production** | Optional | Sender email address (e.g. `noreply@stocksense.com`). |
| `SMTP_HOST` | **Production** | Optional | SMTP mail server hostname (e.g. `smtp.mailtrap.io`). |
| `SMTP_PORT` | **Production** | Optional | SMTP port (`587` for TLS / `465` for SSL). |
| `SMTP_USER` | **Production** | Optional | SMTP authentication username. |
| `SMTP_PASSWORD` | **Production** | Optional | SMTP authentication password. |
| `TEST_DATABASE_URL` | **Development/Test** | Optional | Isolated PostgreSQL connection string used strictly by `npm test`. |

> **⚠️ Security Guard Note**: Never expose `DATABASE_URL`, `JWT_SECRET`, or `SMTP_PASSWORD` with `NEXT_PUBLIC_` prefixes. Secrets are executed exclusively inside Node.js server context.

---

## 🗄️ 3. Database Schema Setup & Safety

StockSense manages database tables safely via [`lib/schema.ts`](file:///c:/Users/Herry%20Vaghasiya/OneDrive/Desktop/odooxhbd/lib/schema.ts).

- **Non-Destructive Initialization**: Uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- **Production Safety**: Application startup **NEVER** drops tables, truncates records, or resets databases automatically.
- **Initial Setup**: Tables and indexes are created automatically on the first server query if they do not yet exist.

---

## 🌾 4. Seed Data Procedure (Acme Manufacturing)

Demo seeding is decoupled from application startup:

- **Command**: `npm run seed`
- **Script File**: [`scripts/seed.ts`](file:///c:/Users/Herry%20Vaghasiya/OneDrive/Desktop/odooxhbd/scripts/seed.ts)
- **Safety**: `npm run seed` is an explicit, manual operation. It **NEVER** executes automatically during `npm run build` or Vercel deployments.
- **Idempotency**: Seeding uses `ON CONFLICT` updates and controlled transaction boundaries.
- **Demo Accounts Created**:
  - **Inventory Manager**: `manager@stocksense.com` / `password123`
  - **Warehouse Staff**: `staff@stocksense.com` / `password123`

---

## 🚀 5. Vercel Production Deployment Steps

Follow these exact steps to deploy StockSense to Vercel:

1. **Push Changes to GitHub**:
   Ensure all changes are committed and pushed to `main` branch on [https://github.com/Jilpatel18/Stock-Sense](https://github.com/Jilpatel18/Stock-Sense).

2. **Connect Repository in Vercel Dashboard**:
   - Log in to [Vercel](https://vercel.com).
   - Click **Add New** $\rightarrow$ **Project**.
   - Select **Import Git Repository** and search for `Jilpatel18/Stock-Sense`.
   - Framework Preset: **Next.js**.

3. **Configure Environment Variables**:
   Under **Environment Variables**, add:
   - `DATABASE_URL` = `<your-neon-postgresql-connection-string>`
   - `JWT_SECRET` = `<your-production-32-plus-character-secret>`
   - `EMAIL_PROVIDER` = `"smtp"` (or `"console"`)
   - `SMTP_HOST` = `<your-smtp-host>`
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = `<your-smtp-user>`
   - `SMTP_PASSWORD` = `<your-smtp-password>`
   - `EMAIL_FROM` = `"no-reply@stocksense.com"`

4. **Deploy**:
   - Click **Deploy**. Vercel will build and deploy the application.

---

## 🧪 6. Post-Deployment Smoke Test Protocol

After deployment completes, verify the live production URL:

1. **Public Landing Page**: Visit `/` and confirm landing page renders cleanly without requiring login.
2. **Login**: Log in using `manager@stocksense.com` / `password123`.
3. **Dashboard**: Verify Total Stock, Low-stock alerts, and Warehouse cards populate from PostgreSQL.
4. **Receipt Validation**: Create a receipt (+100 KG Steel Rod), validate it, and verify stock increases.
5. **Transfer Validation**: Create an internal transfer (Move 30 KG Steel Rod from Raw Material Rack A to Assembly Bay 1), validate it, and verify source stock decreases while destination increases.
6. **Delivery Validation**: Create a delivery order (-20 KG Steel Rod), validate it, and verify stock decreases.
7. **Adjustment Validation**: Create an inventory adjustment (Reconcile count to 67 KG), validate it, and verify stock matches count.
8. **Ledger & Audit**: Inspect `/operations/history` and `/audit-logs` to confirm complete timestamped log entries.
9. **Password Reset OTP**: Request an OTP for a user on `/forgot-password` and verify code entry.

---

## 🛠️ 7. Troubleshooting & Verification Commands

```bash
# 1. Run automated QA hardening test suite
npm test

# 2. Check code style and React hook rules
npm run lint

# 3. Test Next.js production build locally
npm run build

# 4. Boot production server locally
npm start

# 5. Populate demo dataset against target database
npm run seed
```

---

*StockSense IMS — Enterprise Inventory & Auditing Engine.*
