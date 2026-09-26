"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, UserCheck, Shield } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("INVENTORY_MANAGER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err: any) {
      setError("An error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-100">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 text-white items-center justify-center shadow-md shadow-blue-500/20 mb-3">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-blue-600 tracking-tight">Create Account</h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">Join StockSense Inventory Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Vance"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">Role</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("INVENTORY_MANAGER")}
                className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                  role === "INVENTORY_MANAGER"
                    ? "bg-blue-600 text-white font-bold border-blue-600 shadow-xs shadow-blue-500/20"
                    : "bg-zinc-50 border-zinc-300 text-zinc-700 hover:text-black font-medium"
                }`}
              >
                <Shield className="w-4 h-4 mb-1" />
                <p className="font-bold">Inventory Manager</p>
                <p className="text-[10px] opacity-80">Full operations & master data control</p>
              </button>

              <button
                type="button"
                onClick={() => setRole("WAREHOUSE_STAFF")}
                className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                  role === "WAREHOUSE_STAFF"
                    ? "bg-blue-600 text-white font-bold border-blue-600 shadow-xs shadow-blue-500/20"
                    : "bg-zinc-50 border-zinc-300 text-zinc-700 hover:text-black font-medium"
                }`}
              >
                <UserCheck className="w-4 h-4 mb-1" />
                <p className="font-bold">Warehouse Staff</p>
                <p className="text-[10px] opacity-80">Receiving, picking & stock transfers</p>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6 font-medium">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-bold underline hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
