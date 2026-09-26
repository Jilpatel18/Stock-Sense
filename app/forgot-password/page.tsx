"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, ArrowLeft, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_otp", email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message);
        toast.success(data.message || "Verification code sent to your email!");
        setStep("otp");
      } else {
        const errMsg = data.error || "Failed to send OTP";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "An error occurred while requesting OTP.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify_otp", email, otp }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message);
        toast.success(data.message || "OTP verified successfully!");
        setStep("password");
      } else {
        const errMsg = data.error || "Invalid OTP";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "An error occurred during OTP verification.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", email, otp, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message);
        toast.success(data.message || "Password reset successfully!");
      } else {
        const errMsg = data.error || "Password reset failed";
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = "An error occurred during password reset.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-100">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-black text-white items-center justify-center shadow-md shadow-black/20 mb-3 font-extrabold">
            {step === "email" && <KeyRound className="w-6 h-6 text-white" />}
            {step === "otp" && <ShieldCheck className="w-6 h-6 text-white" />}
            {step === "password" && <Lock className="w-6 h-6 text-white" />}
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight">
            {step === "email" && "Reset Password"}
            {step === "otp" && "Verify OTP Code"}
            {step === "password" && "Set New Password"}
          </h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            {step === "email" && "Enter your email to receive a secure 6-digit OTP code."}
            {step === "otp" && `Enter the OTP code sent for ${email}.`}
            {step === "password" && "Enter a new secure password for your account."}
          </p>
        </div>

        {message && (
          <div className="mb-4 p-3.5 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold">
            {error}
          </div>
        )}

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@stocksense.com"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-black hover:bg-zinc-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-black/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Generating OTP..." : "Send Verification OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">Enter 6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.trim())}
                placeholder="6-Digit Code"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 tracking-widest placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors font-mono font-bold text-center text-lg"
              />
              <p className="text-[10px] text-zinc-500 mt-1.5 text-center font-medium">
                Check your server terminal log for the OTP code in local development.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-black hover:bg-zinc-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-black/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Verifying..." : "Verify OTP Code"}
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-800 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-sm text-zinc-950 placeholder-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-black hover:bg-zinc-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-md shadow-black/20 disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Resetting..." : "Set New Password & Complete"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950 font-semibold transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
