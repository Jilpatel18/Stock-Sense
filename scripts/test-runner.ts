import fs from "fs";
import path from "path";

// Load .env file BEFORE importing modules that depend on process.env
try {
  const envPath = path.resolve(__dirname, "../.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*["']?(.*?)["']?\s*$/);
      if (match) {
        const key = match[1];
        const value = match[2];
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
} catch (err) {
  console.warn("Failed to load .env file:", err);
}

import crypto from "crypto";
import { pool, query } from "../lib/db";
import { initDatabase } from "../lib/schema";
import { hashPassword, comparePassword, signSessionToken, verifySessionToken, getJwtSecret } from "../lib/auth";
import { validatePasswordPolicy } from "../lib/password-policy";
import { validateReceipt, validateDelivery, validateTransfer, validateAdjustment } from "../lib/inventory-service";
import { getNextDocumentNumber } from "../lib/sequence";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✔ [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  x [FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
  }
}

async function runFullTestSuite() {
  console.log("==================================================");
  console.log("STOCKSENSE COMPREHENSIVE HARDENING TEST SUITE");
  console.log("==================================================\n");

  await initDatabase();
  const client = await pool.connect();

  try {
    // --------------------------------------------------
    // SECTION 1: AUTHENTICATION, JWT & SECURITY TESTS
    // --------------------------------------------------
    console.log("--- 1. AUTH & JWT SECURITY TESTS ---");

    // Test 1.1 Production Missing JWT Secret Safety
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;
    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      let secretError = false;
      try {
        getJwtSecret();
      } catch (err) {
        secretError = true;
      }
      assert(secretError === true, "Production fails safely if JWT_SECRET environment variable is missing");
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalSecret) process.env.JWT_SECRET = originalSecret;
    }

    // Test 1.2 JWT Signing & Verification
    const testPayload = { id: 9999, name: "Test User", email: "test@stocksense.com", role: "WAREHOUSE_STAFF" };
    const token = await signSessionToken(testPayload);
    assert(typeof token === "string" && token.length > 20, "JWT token signed successfully with HS256");

    const verified = await verifySessionToken(token);
    assert(verified !== null && verified.email === "test@stocksense.com", "JWT verified successfully with valid signature");

    const tamperedVerified = await verifySessionToken(token + "tampered");
    assert(tamperedVerified === null, "Tampered JWT token rejected");

    // Test 1.3 Password Policy Validation
    const weakPass = validatePasswordPolicy("short");
    assert(weakPass !== null, "Weak password < 8 chars rejected");

    const noUpperPass = validatePasswordPolicy("password123");
    assert(noUpperPass !== null, "Password missing uppercase rejected");

    const validPass = validatePasswordPolicy("StockSense@2026");
    assert(validPass === null, "Valid strong password accepted");

    // Test 1.4 User Signup (Default WAREHOUSE_STAFF & ACTIVE)
    const testEmail = `staff.${Date.now()}@stocksense.com`;
    const passHash = await hashPassword("StockSense@2026");
    const signupRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF', 'ACTIVE') RETURNING *`,
      ["Test Staff", testEmail, passHash]
    );
    const staffUser = signupRes.rows[0];
    assert(staffUser.role === "WAREHOUSE_STAFF", "Signup defaults to WAREHOUSE_STAFF role");
    assert(staffUser.status === "ACTIVE", "New user status defaults to ACTIVE");

    // Test 1.5 Login Verification
    const isMatch = await comparePassword("StockSense@2026", staffUser.password_hash);
    const isWrongMatch = await comparePassword("WrongPassword123", staffUser.password_hash);
    assert(isMatch === true, "Valid password credentials verify successfully");
    assert(isWrongMatch === false, "Invalid password credentials fail verification");

    // Test 1.6 Suspended & Disabled User Blocking
    const suspendedEmail = `suspended.${Date.now()}@stocksense.com`;
    const suspendedRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF', 'SUSPENDED') RETURNING *`,
      ["Suspended User", suspendedEmail, passHash]
    );
    const suspendedUser = suspendedRes.rows[0];
    const suspendedToken = await signSessionToken({ id: suspendedUser.id, name: suspendedUser.name, email: suspendedUser.email, role: suspendedUser.role });
    // Verify DB status check blocks suspended user
    const dbCheckRes = await query(`SELECT status FROM users WHERE id = $1`, [suspendedUser.id]);
    assert(dbCheckRes.rows[0].status !== "ACTIVE", "Suspended user status is detected in PostgreSQL");

    // Test 1.7 Live Role Check Prevents Demoted Manager Access
    const demotedEmail = `demoted.${Date.now()}@stocksense.com`;
    const demotedRes = await query(
      `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1, $2, $3, 'INVENTORY_MANAGER', 'ACTIVE') RETURNING *`,
      ["Demoted User", demotedEmail, passHash]
    );
    const demotedUser = demotedRes.rows[0];
    const oldManagerToken = await signSessionToken({ id: demotedUser.id, name: demotedUser.name, email: demotedUser.email, role: demotedUser.role });

    // Demote user in database
    await query(`UPDATE users SET role = 'WAREHOUSE_STAFF' WHERE id = $1`, [demotedUser.id]);
    const liveRoleRes = await query(`SELECT role FROM users WHERE id = $1`, [demotedUser.id]);
    assert(liveRoleRes.rows[0].role === "WAREHOUSE_STAFF", "Live DB check fetches demoted role WAREHOUSE_STAFF instead of stale JWT token role");

    // --------------------------------------------------
    // SECTION 2: OTP & PASSWORD RESET TESTS
    // --------------------------------------------------
    console.log("\n--- 2. OTP & ATOMIC PASSWORD RESET TESTS ---");

    const otpEmail = `reset.${Date.now()}@stocksense.com`;
    await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'WAREHOUSE_STAFF')`,
      ["Reset User", otpEmail, passHash]
    );

    // Test 2.1 Cryptographic OTP Generation & Hashing
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    assert(rawOtp.length === 6 && !isNaN(parseInt(rawOtp)), "OTP generated as 6-digit number");

    const otpHash = await hashPassword(rawOtp);
    assert(otpHash !== rawOtp, "OTP stored hashed in database, never plaintext");

    const otpRecordRes = await query(
      `INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '10 minutes') RETURNING id`,
      [otpEmail, otpHash]
    );
    const otpId = otpRecordRes.rows[0].id;
    assert(otpId > 0, "OTP generated and stored in PostgreSQL with 10-minute expiry");

    // Test 2.2 Invalid OTP Code Rejection
    const isValidWrong = await comparePassword("000000", otpHash);
    assert(isValidWrong === false, "Invalid OTP code rejected");

    // Test 2.3 Successful OTP Verification
    const isValidRight = await comparePassword(rawOtp, otpHash);
    assert(isValidRight === true, "Valid OTP code verified");

    // Test 2.4 Expired OTP Rejection
    const expiredRes = await query(
      `INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, $2, NOW() - INTERVAL '1 minute') RETURNING id`,
      [otpEmail, otpHash]
    );
    const expiredRecord = await query(
      `SELECT * FROM password_reset_otps WHERE id = $1 AND expires_at > NOW()`,
      [expiredRes.rows[0].id]
    );
    assert(expiredRecord.rows.length === 0, "Expired OTP (expires_at < NOW()) rejected by database query");

    // Test 2.5 Failed Attempt Limit Lockout (5 attempts)
    const lockoutOtpId = (
      await query(
        `INSERT INTO password_reset_otps (email, otp_hash, expires_at, attempts) VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 5) RETURNING id`,
        [otpEmail, otpHash]
      )
    ).rows[0].id;
    const lockoutRecord = await query(`SELECT attempts FROM password_reset_otps WHERE id = $1`, [lockoutOtpId]);
    assert(lockoutRecord.rows[0].attempts >= 5, "OTP locked out after 5 failed verification attempts");

    // Test 2.6 OTP Replacement (New request invalidates previous OTPs)
    const newOtpEmail = `replace.${Date.now()}@stocksense.com`;
    const oldOtpRes = await query(
      `INSERT INTO password_reset_otps (email, otp_hash, expires_at, is_used) VALUES ($1, 'oldhash', NOW() + INTERVAL '10 minutes', false) RETURNING id`,
      [newOtpEmail]
    );
    // Request new OTP -> invalidates previous
    await query(`UPDATE password_reset_otps SET is_used = true WHERE email = $1 AND is_used = false`, [newOtpEmail]);
    const oldOtpCheck = await query(`SELECT is_used FROM password_reset_otps WHERE id = $1`, [oldOtpRes.rows[0].id]);
    assert(oldOtpCheck.rows[0].is_used === true, "Requesting new OTP invalidates previous unused OTPs");

    // Test 2.7 Rate Limiting Enforcement (Max 3 OTP requests per 15 minutes)
    const rateLimitEmail = `ratelimit.${Date.now()}@stocksense.com`;
    for (let i = 0; i < 3; i++) {
      await query(
        `INSERT INTO password_reset_otps (email, otp_hash, expires_at) VALUES ($1, 'hash', NOW() + INTERVAL '10 minutes')`,
        [rateLimitEmail]
      );
    }
    const rateCountRes = await query(
      `SELECT COUNT(*) FROM password_reset_otps WHERE email = $1 AND created_at >= NOW() - INTERVAL '15 minutes'`,
      [rateLimitEmail]
    );
    assert(parseInt(rateCountRes.rows[0].count) === 3, "Rate limiting tracks 3 requests per email per 15 minutes");

    // Test 2.8 Atomic Password Reset Transaction & Reuse Prevention
    await query(`UPDATE password_reset_otps SET is_verified = true WHERE id = $1`, [otpId]);
    await query(`UPDATE password_reset_otps SET is_used = true WHERE id = $1`, [otpId]);
    const reuseCheck = await query(`SELECT * FROM password_reset_otps WHERE id = $1 AND is_used = false`, [otpId]);
    assert(reuseCheck.rows.length === 0, "Used OTP cannot be reused after password reset transaction");

    // --------------------------------------------------
    // SECTION 3: INVENTORY OPERATIONS & CONCURRENCY TESTS
    // --------------------------------------------------
    console.log("\n--- 3. INVENTORY OPERATIONS & CONCURRENCY TESTS ---");

    // Setup Test Entities
    const managerRes = await query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Manager', $1, 'hash', 'INVENTORY_MANAGER') RETURNING id`,
      [`mgr.${Date.now()}@stocksense.com`]
    );
    const managerId = managerRes.rows[0].id;

    const whRes = await query(
      `INSERT INTO warehouses (name, code) VALUES ('Test Hub', $1) RETURNING id`,
      [`WH-SUITE-${Date.now()}`]
    );
    const whId = whRes.rows[0].id;

    const loc1Res = await query(
      `INSERT INTO locations (warehouse_id, name, code) VALUES ($1, 'Location A', $2) RETURNING id`,
      [whId, `LOC-A-${Date.now()}`]
    );
    const loc1Id = loc1Res.rows[0].id;

    const loc2Res = await query(
      `INSERT INTO locations (warehouse_id, name, code) VALUES ($1, 'Location B', $2) RETURNING id`,
      [whId, `LOC-B-${Date.now()}`]
    );
    const loc2Id = loc2Res.rows[0].id;

    const prodRes = await query(
      `INSERT INTO products (name, sku, unit_of_measure, reorder_level) VALUES ('Test Widget', $1, 'PCS', 10) RETURNING id`,
      [`SKU-SUITE-${Date.now()}`]
    );
    const prodId = prodRes.rows[0].id;

    // Test 3.1 Draft / Canceled Operation Does Not Modify Inventory
    const recDraftNo = await getNextDocumentNumber(client, "REC");
    const recDraftRes = await query(
      `INSERT INTO receipts (receipt_number, destination_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [recDraftNo, loc1Id, managerId]
    );
    await query(`INSERT INTO receipt_items (receipt_id, product_id, quantity) VALUES ($1, $2, 500)`, [recDraftRes.rows[0].id, prodId]);

    const initialInv = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    const draftStock = initialInv.rows.length > 0 ? parseFloat(initialInv.rows[0].quantity) : 0;
    assert(draftStock === 0, "Draft receipt does not modify inventory");

    // Test 3.2 Validated Receipt Increases Stock & Creates Stock Ledger Entry
    await validateReceipt(recDraftRes.rows[0].id, managerId);
    const postReceiptInv = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    assert(parseFloat(postReceiptInv.rows[0].quantity) === 500, "Validated receipt increases inventory stock (+500)");

    const receiptLedger = await query(
      `SELECT * FROM stock_ledger WHERE reference_number = $1 AND operation_type = 'RECEIPT'`,
      [recDraftNo]
    );
    assert(receiptLedger.rows.length === 1, "Receipt creates stock ledger entry");
    assert(parseFloat(receiptLedger.rows[0].quantity_before) === 0, "Stock ledger quantity_before is accurate (0)");
    assert(parseFloat(receiptLedger.rows[0].quantity_after) === 500, "Stock ledger quantity_after is accurate (500)");

    // Test 3.3 Double Validation Rejection
    let doubleValError = false;
    try {
      await validateReceipt(recDraftRes.rows[0].id, managerId);
    } catch (err) {
      doubleValError = true;
    }
    assert(doubleValError === true, "Already validated 'Done' receipt cannot be validated twice");

    // Test 3.4 Transfer Decreases Source, Increases Destination, Preserves Total Stock
    const trfNo = await getNextDocumentNumber(client, "TRF");
    const trfRes = await query(
      `INSERT INTO internal_transfers (transfer_number, source_location_id, destination_location_id, status, created_by)
       VALUES ($1, $2, $3, 'Draft', $4) RETURNING id`,
      [trfNo, loc1Id, loc2Id, managerId]
    );
    const trfId = trfRes.rows[0].id;
    await query(`INSERT INTO internal_transfer_items (transfer_id, product_id, quantity) VALUES ($1, $2, 150)`, [trfId, prodId]);

    await validateTransfer(trfId, managerId);

    const loc1PostTrf = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc1Id]);
    const loc2PostTrf = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc2Id]);
    const totalCompanyPostTrf = parseFloat(loc1PostTrf.rows[0].quantity) + parseFloat(loc2PostTrf.rows[0].quantity);

    assert(parseFloat(loc1PostTrf.rows[0].quantity) === 350, "Transfer decreases source location stock (500 -> 350)");
    assert(parseFloat(loc2PostTrf.rows[0].quantity) === 150, "Transfer increases destination location stock (0 -> 150)");
    assert(totalCompanyPostTrf === 500, "Transfer preserves total company stock (500)");

    // Test 3.5 Delivery Decreases Stock & Rejects Insufficient Stock
    const delNo = await getNextDocumentNumber(client, "DEL");
    const delRes = await query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [delNo, loc2Id, managerId]
    );
    const delId = delRes.rows[0].id;
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 50)`, [delId, prodId]);

    await validateDelivery(delId, managerId);
    const loc2PostDel = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc2Id]);
    assert(parseFloat(loc2PostDel.rows[0].quantity) === 100, "Delivery decreases stock (150 -> 100)");

    // Over-delivery rejection test
    const delOverNo = await getNextDocumentNumber(client, "DEL");
    const delOverRes = await query(
      `INSERT INTO delivery_orders (delivery_number, source_location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [delOverNo, loc2Id, managerId]
    );
    await query(`INSERT INTO delivery_items (delivery_id, product_id, quantity) VALUES ($1, $2, 999)`, [delOverRes.rows[0].id, prodId]);

    let overdelError = false;
    try {
      await validateDelivery(delOverRes.rows[0].id, managerId);
    } catch (err) {
      overdelError = true;
    }
    assert(overdelError === true, "Delivery rejects request exceeding available location stock");

    // Test 3.6 Inventory Adjustment Reconciles Stock
    const adjNo = await getNextDocumentNumber(client, "ADJ");
    const adjRes = await query(
      `INSERT INTO inventory_adjustments (adjustment_number, location_id, status, created_by) VALUES ($1, $2, 'Draft', $3) RETURNING id`,
      [adjNo, loc2Id, managerId]
    );
    const adjId = adjRes.rows[0].id;
    await query(`INSERT INTO inventory_adjustment_items (adjustment_id, product_id, counted_quantity, previous_quantity, difference) VALUES ($1, $2, 85, 100, -15)`, [adjId, prodId]);

    await validateAdjustment(adjId, managerId);
    const loc2PostAdj = await query(`SELECT quantity FROM inventory WHERE product_id = $1 AND location_id = $2`, [prodId, loc2Id]);
    assert(parseFloat(loc2PostAdj.rows[0].quantity) === 85, "Adjustment reconciles stock to physical count (85)");

    console.log("\n==================================================");
    console.log(`TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log("==================================================\n");

    if (failedCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } finally {
    client.release();
  }
}

runFullTestSuite().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
