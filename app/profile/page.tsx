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
  Lock,
  User,
  AlertCircle,
} from "lucide-react";

import { getInitials, formatRole } from "@/components/AppLayout";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user) {
          setName(data.user.name || "");
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword && !currentPassword) {
      setError("Please enter your current password to change password.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "Profile updated successfully!");
        setUser(data.user);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-zinc-500 text-xs font-medium">Loading user profile...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 text-center text-zinc-400 space-y-4">
        <p className="text-xs font-semibold">You are not logged in.</p>
        <Link href="/login" className="px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold inline-block shadow-xs">
          Log In
        </Link>
      </div>
    );
  }

  const isManager = user.role === "INVENTORY_MANAGER";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black text-white flex items-center justify-center text-lg font-black uppercase shadow-md shadow-black/20 shrink-0">
              {getInitials(user.name, user.email)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-black tracking-tight">{user.name || user.email}</h1>
              <p className="text-xs text-zinc-600 flex items-center gap-1.5 mt-0.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-black text-white shadow-xs shadow-black/20">
              {isManager ? <Shield className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {formatRole(user.role)}
            </span>

            <button
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-zinc-950 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-5 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-black" /> Update Profile & Security
        </h2>

        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 text-zinc-500 rounded-xl font-medium cursor-not-allowed"
              />
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-4 space-y-4">
            <h3 className="font-bold text-zinc-950 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-600" /> Change Password (Optional)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required for password change"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-black hover:bg-zinc-800 text-white font-extrabold rounded-xl transition-all disabled:opacity-50 shadow-xs shadow-black/20"
            >
              {saving ? "Saving Changes..." : "Save Profile Updates"}
            </button>
          </div>
        </form>
      </div>

      {/* Role Capabilities Overview */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
          Role Capabilities & System Permissions
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
