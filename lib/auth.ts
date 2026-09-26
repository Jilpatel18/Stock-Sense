import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is missing in production!");
}

const JWT_SECRET_STRING = process.env.JWT_SECRET || "stocksense_super_secret_jwt_key_2026_safe_fallback";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
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
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
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
    return await verifySessionToken(token);
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
