# StockSense Production Deployment Checklist

Use this checklist prior to deploying StockSense to production environments (e.g. Vercel + Neon DB).

---

## 🗄️ Database & Environment Configuration

- [ ] **Neon Production Database Instance**: Created dedicated production database branch/cluster.
- [ ] **`DATABASE_URL`**: Configured safely with `sslmode=require` in hosting provider environment variables.
- [ ] **`JWT_SECRET`**: Configured with cryptographically strong secret ($\ge 32$ chars). Must NOT use fallback defaults.
- [ ] **`EMAIL_PROVIDER`**: Set to `"smtp"` for production email delivery or `"console"` for sandbox testing.
- [ ] **`SMTP_HOST`**: Configured with production SMTP mail server address.
- [ ] **`SMTP_PORT`**: Set to `587` (TLS) or `465` (SSL).
- [ ] **`SMTP_USER`**: Configured with authorized SMTP username.
- [ ] **`SMTP_PASSWORD`**: Configured securely with SMTP password.
- [ ] **`EMAIL_FROM`**: Set to verified sender address (e.g., `noreply@stocksense.com`).

---

## 🛡️ Production Safety & Hardening

- [ ] **Schema Initialization**: Non-destructive `CREATE TABLE IF NOT EXISTS` initialization verified (`lib/schema.ts`).
- [ ] **Production Seeding Guard**: Confirmed demo seeding (`npm run seed`) is an explicit command and DOES NOT execute automatically on production build/startup.
- [ ] **No Secrets Exposed to Client**: Verified no `NEXT_PUBLIC_` prefixes on `DATABASE_URL`, `JWT_SECRET`, or `SMTP_PASSWORD`.
- [ ] **Query Log Sanitization**: Verified SQL parameters are excluded from error logs (`lib/db.ts`).
- [ ] **Security Headers**: Verified HTTP security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) in `next.config.ts`.

---

## 🧪 Build & Quality Assurance

- [ ] **`npm test`**: Executed automated QA suite — **31/31 PASSED**.
- [ ] **`npm run lint`**: Executed ESLint — **0 ERRORS**.
- [ ] **`npm run build`**: Executed Next.js production build — **COMPILED SUCCESSFULLY**.
- [ ] **`npm run start`**: Verified local production server boots and functions cleanly.

---

## 🔄 Functional Smoke Test Verification

- [ ] **Authentication**: User signup, login, logout, password recovery with OTP, and session persistence verified.
- [ ] **RBAC Enforcement**: Warehouse Staff denied access to Manager APIs (403 Forbidden); Manager allowed (200 OK).
- [ ] **Receipts**: Inbound receipt validation (+Stock) writes immutable stock ledger entry.
- [ ] **Internal Transfers**: Multi-location stock transfer (Source -Stock, Destination +Stock) conserves total company stock.
- [ ] **Deliveries**: Outbound delivery (-Stock) rejects requests exceeding available stock.
- [ ] **Adjustments**: Physical stock reconciliation (+/- difference) adjusts stock to count.
- [ ] **Ledger & Audit Trails**: History view accurately reflects operations with sensitive data redacted.
- [ ] **Global Search & CSV Exports**: Server-side search and permission-aware CSV downloads function smoothly.
- [ ] **Mobile & Desktop Layout**: UI tested across desktop, tablet, and mobile viewport breakpoints.

---

## 🚀 Final Sign-Off

**Status**: READY FOR PRODUCTION DEPLOYMENT
**Repo**: [https://github.com/Jilpatel18/Stock-Sense](https://github.com/Jilpatel18/Stock-Sense)
**Core Philosophy Enforced**: *"Every stock change is an auditable transaction."*
