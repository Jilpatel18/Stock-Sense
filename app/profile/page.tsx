"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  UserCheck,
  Mail,
  LogOut,
  CheckCircle2,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return <div className="text-center py-12 text-zinc-500 text-xs">Loading user profile...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center text-zinc-400 space-y-4">
        <p>You are not logged in.</p>
        <Link href="/login" className="px-4 py-2 bg-white text-black rounded-xl text-xs font-bold">
          Log In
        </Link>
      </div>
    );
  }

  const isManager = user.role === "INVENTORY_MANAGER";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-black uppercase shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-950 tracking-tight">{user.name}</h1>
              <p className="text-xs text-zinc-600 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-black text-white"
            >
              {isManager ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {isManager ? "Inventory Manager" : "Warehouse Staff"}
            </span>

            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-zinc-950 rounded-xl hover:bg-zinc-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Role Capabilities Overview */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Role Capabilities & Permissions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <span className="font-bold text-zinc-950 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Receiving Goods
            </span>
            <p className="text-[11px] text-zinc-600">Process incoming vendor shipments and update warehouse storage.</p>
          </div>

          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <span className="font-bold text-zinc-950 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Delivery Shipments
            </span>
            <p className="text-[11px] text-zinc-600">Pick, pack, and validate customer delivery orders with stock check.</p>
          </div>

          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <span className="font-bold text-zinc-950 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Internal Transfers
            </span>
            <p className="text-[11px] text-zinc-600">Relocate stock between racks or across different warehouse sites.</p>
          </div>

          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <span className="font-bold text-zinc-950 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Stock Adjustments
            </span>
            <p className="text-[11px] text-zinc-600">Reconcile physical inventory counts and report damaged stock.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
