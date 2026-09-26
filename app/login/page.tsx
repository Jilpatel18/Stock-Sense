"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, ShieldCheck, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err: any) {
      setError("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setLoading(true);
    setError(null);

    try {
      let res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: demoEmail, password: "password123" }),
      });

      if (!res.ok) {
        await fetch("/api/seed", { method: "POST" });
        res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: demoEmail, password: "password123" }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Demo login failed");
      }
    } catch (err: any) {
      setError("Error executing demo login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-100">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-black text-white items-center justify-center shadow-sm mb-3">
            <Boxes className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">StockSense</h1>
          <p className="text-xs text-zinc-600 mt-1">Enterprise Modular Inventory Management</p>
        </div>

        {/* Demo Quick Logins */}
        <div className="mb-6 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
          <p className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-black" />
            Quick Demo Access (1-Click)
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("manager@stocksense.com")}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-sm flex items-center justify-between transition-all"
            >
              <span>Manager Role</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemoLogin("staff@stocksense.com")}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-sm flex items-center justify-between transition-all"
            >
              <span>Staff Role</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink mx-4 text-[11px] font-mono text-zinc-500 uppercase">Or sign in with email</span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@stocksense.com"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-zinc-700">Password</label>
              <Link href="/forgot-password" className="text-xs text-zinc-600 hover:text-zinc-950 underline font-medium">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-black hover:bg-zinc-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Don't have an account?{" "}
          <Link href="/signup" className="text-black font-bold underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
}
