# StockSense — Modern Inventory Management & Audit System

> **"Every stock change is an auditable transaction."**

StockSense is a hackathon-ready, enterprise-grade Inventory Management System (IMS) built with **Next.js**, **TypeScript**, **PostgreSQL (Neon)**, and **Tailwind CSS**. Designed around strict transactional integrity, role-based access control, and complete ledger immutability, StockSense ensures that every unit of stock moved, received, delivered, or adjusted is transparently tracked and verified.

---

## 📋 Problem & Solution

### The Problem
Traditional inventory tracking software often suffers from:
- **Untracked stock mutations**: Client-side inventory updates leading to race conditions and phantom stock.
- **Lack of immutability**: Editable inventory histories that allow unauthorized retrospective modifications.
- **Insecure authentication & session leaks**: Weak password policies, plaintext OTPs, and missing environment secrets in production.
- **Uncoordinated multi-location transfers**: Discrepancies between source and destination warehouse records.

### The StockSense Solution
StockSense enforces a strict server-side architecture:
1. **Server-Enforced Transactions**: Inventory levels can *only* be altered via validated operations executing inside PostgreSQL transactions.
2. **Immutable Stock Ledger**: Every inventory change writes a permanent, read-only ledger record containing `quantity_before`, `quantity_change`, `quantity_after`, user details, and timestamps.
3. **Double-Validation Prevention**: Operations strictly check status transitions (`Draft` / `Ready` -> `Done`), preventing double-counting or concurrent validation race conditions.
4. **Security Hardening**: Cryptographic OTP generation, bcrypt password hashing, production JWT secret enforcement, live RBAC checks, and rate-limited endpoints.

---

## 🚀 Key Features

- **📊 Real-time Dashboard**: Live metrics for Total SKUs, Total Stock, Low-stock alerts, Pending Receipts, Deliveries, Transfers, and Recent Adjustments.
- **🔍 Global Search**: Instant server-side search across Products, SKUs, Warehouses, Locations, Receipts, Deliveries, and Transfers without loading heavy datasets into the browser.
- **📥 CSV Data Exports**: Filtered, permission-aware CSV downloads for Products, Stock Ledger, Receipts, Deliveries, and Adjustments.
- **🏷️ Product & Category Management**: Unique SKU enforcement, unit of measure configuration, reorder thresholds, and soft deactivation to preserve historical reference integrity.
- **🏭 Warehouse & Location Hierarchy**: Multi-warehouse management with unique location codes per warehouse (Storage, Production, Dispatch).
- **📦 Full Operations Lifecycle**:
  - **Receipts**: Inbound supplier inventory (+stock).
  - **Internal Transfers**: Multi-location movements (Source -stock, Destination +stock, total system quantity conserved).
  - **Deliveries**: Outbound customer fulfillments (-stock, with insufficient stock validation).
  - **Adjustments**: Physical count reconciliation (+/- difference stock adjustment).
- **📜 Immutable Stock Ledger & Audit Log**: Complete historical evidence with automatic sensitive data redaction (passwords, OTPs, JWT secrets).
- **🔒 Hardened Authentication & Password Recovery**: JWT session tokens with live DB role validation, cryptographically secure 6-digit OTPs (10-min expiry, max 5 attempts lockout, 3 requests / 15 min rate limit).

---

## 🛠️ Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │                   Next.js App Router                   │
   │               (React 19 + Tailwind CSS)                │
   └──────────────────────────┬─────────────────────────────┘
                              │ HTTPS / JSON API
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │                Server Route Handlers                   │
   │       (RBAC Auth Middleware + Input Sanitization)      │
   └──────────────────────────┬─────────────────────────────┘
                              │ Server-Side Call
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │               Inventory Core Service                   │
   │    (validateReceipt, validateTransfer, validateDel)    │
   └──────────────────────────┬─────────────────────────────┘
                              │ BEGIN ... COMMIT
                              ▼
   ┌────────────────────────────────────────────────────────┐
   │                 PostgreSQL (Neon DB)                   │
   │  ┌───────────────────┬──────────────────────────────┐  │
   │  │ inventory (FOR UPDATE) │ stock_ledger (Immutable) │  │
   │  ├───────────────────┼──────────────────────────────┤  │
   │  │ users & RBAC      │ audit_logs (Redacted)        │  │
   │  └───────────────────┴──────────────────────────────┘  │
   └────────────────────────────────────────────────────────┘
```

### Technology Stack
- **Framework**: Next.js 16 (App Router, Server Actions, Turbopack)
- **Language**: TypeScript 5
- **Database**: Neon PostgreSQL via `pg` driver (Node-PostgreSQL pool)
- **Authentication**: `jose` (JWT with HS256), `bcryptjs`
- **Styling**: Tailwind CSS v4, Lucide React icons
- **Security & Testing**: Custom automated test suite with production safety guards

---

## 🔑 Demo Credentials

After running `npm run seed` or initiating the demo seed, log in with:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Inventory Manager** | `manager@stocksense.com` | `password123` |
| **Warehouse Staff** | `staff@stocksense.com` | `password123` |

---

## 🧮 Final Inventory Math Verification

StockSense guarantees mathematical consistency between UI displays and database queries:

```
Product: Steel Rod (SKU: STEEL-001)

1. Receipt REC-00001        : +100 KG  (Raw Material Rack A)
2. Internal Transfer TRF-001:  -30 KG  (Raw Material Rack A -> Assembly Bay 1)
                               +30 KG  (Assembly Bay 1)
3. Delivery DEL-00001       :  -20 KG  (Assembly Bay 1)
4. Adjustment ADJ-00001     :   -3 KG  (Physical count Raw Material Rack A = 67 KG)
----------------------------------------------------------------------------------
Final System Total Stock    :   77 KG  (67 KG Raw Rack A + 10 KG Assembly Bay 1)

Equation: 100 - 30 + 30 - 20 - 3 = 77 KG
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL Connection URL (Neon DB)
DATABASE_URL="postgres://user:password@ep-sample-pool.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Secret Key (Required in Production)
JWT_SECRET="your-super-secret-jwt-signing-key-min-32-chars"

# Optional Test Database URL for npm test
TEST_DATABASE_URL="postgres://user:password@ep-sample-pool.us-east-2.aws.neon.tech/testdb?sslmode=require"

# Optional Email SMTP Settings for Live OTP Sending
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
SMTP_FROM="noreply@stocksense.com"
```

---

## 🚦 Getting Started & Setup

### 1. Installation
```bash
git clone https://github.com/Jilpatel18/Stock-Sense.git
cd Stock-Sense
npm install
```

### 2. Database Initialization & Seeding
```bash
# Seed Acme Manufacturing demo data
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to launch StockSense.

---

## 🧪 Testing & Production Safety

StockSense features an automated end-to-end hardening test suite.

```bash
# Execute comprehensive QA & Security tests
npm test
```

### Safety Features
- **Production Guard**: Prevents running destructive test suites when `NODE_ENV=production` unless explicitly authorized.
- **Dedicated Test DB Support**: Automatically uses `TEST_DATABASE_URL` when configured.
- **Test Data Cleanup**: Cleans generated records post-execution to prevent database pollution.

---

## 🔒 Security & Hardening Audit Checklist

- [x] **No Hardcoded JWT Fallback**: Production crashes safely if `JWT_SECRET` is missing.
- [x] **Cryptographic OTPs**: 6-digit random OTPs hashed with `bcrypt`, 10-min lifetime, 5-attempt lockout, 3 requests / 15 min rate limit.
- [x] **RBAC Enforcement**: Live database check verifies user role on every protected request.
- [x] **SQL Injection Protection**: 100% parameterized SQL queries (`$1, $2`).
- [x] **Double-Validation Shield**: SQL transactions wrap operation validations, enforcing single state transition (`Draft` -> `Done`).
- [x] **Audit Redaction**: Automatic stripping of sensitive keys (`password`, `otp`, `jwt_secret`) from `audit_logs`.

---

## 🔮 Future Scope
- Multi-currency product valuation.
- Automated barcode/QR code scanning integration for handheld warehouse scanners.
- Webhook integrations for e-commerce platforms (Shopify/WooCommerce).
- AI-driven reorder level forecasting based on seasonal delivery trends.

---

*StockSense — Developed for Hackathon Excellence.*
