import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { query } from "./db";

export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.trim() === "") {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production!");
    }
    return new TextEncoder().encode(secret);
  }
  return new TextEncoder().encode(secret || "stocksense_super_secret_jwt_key_2026_dev_fallback");
}

const COOKIE_NAME = "stocksense_session";

export interface UserPayload {
  id: number;
  name: string;
  email: string;
  role: string; // 'INVENTORY_MANAGER' | 'WAREHOUSE_STAFF'
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: UserPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<UserPayload | null> {
  try {
    const verified = await jwtVerify(token, getJwtSecret());
    return verified.payload as unknown as UserPayload;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = await verifySessionToken(token);
    if (!verified || !verified.id) return null;

    // Verify current user status and live role directly from PostgreSQL
    const res = await query(
      `SELECT id, name, email, role, status FROM users WHERE id = $1`,
      [verified.id]
    );

    if (res.rows.length === 0) return null;
    const dbUser = res.rows[0];

    // Block suspended, disabled, or inactive users from performing protected operations
    if (dbUser.status && dbUser.status !== "ACTIVE") {
      return null;
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role, // Live role from DB prevents demoted JWT vulnerability
    };
  } catch (err) {
    return null;
  }
}

export async function requireAuth(): Promise<UserPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}

export async function requireManager(): Promise<UserPayload> {
  const user = await requireAuth();
  if (user.role !== "INVENTORY_MANAGER") {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(allowedRoles: string[]): Promise<UserPayload> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export function handleAuthError(err: any): NextResponse | null {
  if (err?.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (err?.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Access denied. Insufficient permissions." }, { status: 403 });
  }
  return null;
}

export async function setSessionCookie(user: UserPayload) {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
