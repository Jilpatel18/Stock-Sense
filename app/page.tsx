"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  History,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Warehouse,
  Package,
  Layers,
  Users,
  Search,
  ChevronRight,
  Menu,
  X,
  FileText,
  Activity,
  Sparkles,
} from "lucide-react";


export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "ledger" | "validation">("dashboard");
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans selection:bg-black selection:text-white flex flex-col">
      {/* -------------------------------------------------- */}
      {/* 1. NAVBAR */}
      {/* -------------------------------------------------- */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center font-black shadow-md group-hover:scale-105 transition-transform">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-black tracking-tight flex items-center gap-1.5">
                Stock<span className="text-zinc-600 font-semibold">Sense</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-300">
                  IMS
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-zinc-600">
            <a href="#product" className="hover:text-black transition-colors">Product</a>
            <a href="#how-it-works" className="hover:text-black transition-colors">How It Works</a>
            <a href="#features" className="hover:text-black transition-colors">Features</a>
            <a href="#security" className="hover:text-black transition-colors">Security</a>
            <a href="#ledger" className="hover:text-black transition-colors">Ledger & Audit</a>
          </div>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-bold text-zinc-800 hover:text-black transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-extrabold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Open StockSense</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-xs font-extrabold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-700 hover:text-black"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 mt-3 pt-3 pb-4 space-y-3 px-2 animate-in fade-in slide-in-from-top-2">
            <a
              href="#product"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              How It Works
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Features
            </a>
            <a
              href="#security"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Security
            </a>
            <a
              href="#ledger"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-100 rounded-lg"
            >
              Ledger & Audit
            </a>
            <div className="pt-2 grid grid-cols-2 gap-2">
              {!user ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center px-4 py-2 text-xs font-bold text-zinc-800 bg-zinc-100 rounded-lg border border-zinc-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-center px-4 py-2 text-xs font-extrabold text-white bg-black rounded-lg"
                  >
                    Open StockSense
                  </Link>
                </>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="col-span-2 text-center px-4 py-2 text-xs font-extrabold text-white bg-black rounded-lg"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* -------------------------------------------------- */}
      {/* 2. HERO SECTION */}
      {/* -------------------------------------------------- */}
      <section className="pt-12 lg:pt-20 pb-16 px-4 lg:px-8 border-b border-zinc-200 bg-linear-to-b from-zinc-50/50 to-white">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-extrabold tracking-wide uppercase shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Transactional Multi-Warehouse Inventory System
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.08] max-w-4xl mx-auto">
            Know what you have.<br />
            Know where it is.<br />
            <span className="text-zinc-600">Know what happened.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
            StockSense gives teams a single, auditable view of inventory across warehouses, locations, receipts, deliveries, transfers, and adjustments.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="w-full sm:w-auto px-7 py-3.5 text-sm font-extrabold text-white bg-black hover:bg-zinc-800 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
            >
              <span>{user ? "Go to Dashboard" : "Open StockSense"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-7 py-3.5 text-sm font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-xl border border-zinc-200 transition-colors text-center"
            >
              See how it works
            </a>
          </div>

          {/* Hero Story Connection Badge */}
          <div className="pt-6 flex items-center justify-center gap-2 text-xs font-mono font-bold text-zinc-500 overflow-x-auto">
            <span className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900">Inventory</span>
            <span>→</span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900">Transaction</span>
            <span>→</span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900">Ledger</span>
            <span>→</span>
            <span className="px-2.5 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-900">Audit</span>
          </div>

          {/* -------------------------------------------------- */}
          {/* REALISTIC APPLICATION DASHBOARD VISUAL PREVIEW */}
          {/* -------------------------------------------------- */}
          <div className="pt-10 max-w-5xl mx-auto">
            <div className="bg-white border border-zinc-300 rounded-2xl shadow-2xl overflow-hidden text-left font-sans">
              {/* Mock Application Window Header */}
              <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-xs font-bold text-zinc-600">stocksense.app/dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Live System Status: Normal
                  </span>
                </div>
              </div>

              {/* Mock Dashboard Body */}
              <div className="p-4 sm:p-6 space-y-6 bg-zinc-50/50">
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total Stock</p>
                    <p className="text-2xl font-black text-black mt-1">12,840 <span className="text-xs font-normal text-zinc-500">units</span></p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Healthy Distribution
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Low Stock SKUs</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">1 <span className="text-xs font-normal text-zinc-500">alert</span></p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Motor (MOTOR-001)
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Warehouses</p>
                    <p className="text-2xl font-black text-black mt-1">3 <span className="text-xs font-normal text-zinc-500">active</span></p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      Main, Raw, Finished
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Total SKUs</p>
                    <p className="text-2xl font-black text-black mt-1">5 <span className="text-xs font-normal text-zinc-500">items</span></p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                      Acme Manufacturing
                    </span>
                  </div>
                </div>

                {/* Split Row: Recent Operations & Stock Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Recent Activity Stream (2 Columns) */}
                  <div className="lg:col-span-2 p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-black flex items-center gap-2">
                        <Activity className="w-4 h-4 text-black" />
                        Recent Audited Stock Movements
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400">Validated Server Records</span>
                    </div>

                    <div className="space-y-2 font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">RECEIPT</span>
                          <span className="font-bold text-zinc-900">Steel Rod (STEEL-001)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-700">+100 KG</span>
                          <span className="text-[10px] text-zinc-400 block font-sans">Raw Material Rack A</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">TRANSFER</span>
                          <span className="font-bold text-zinc-900">Steel Rod (STEEL-001)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sky-700">-30 / +30 KG</span>
                          <span className="text-[10px] text-zinc-400 block font-sans">Raw Rack A → Assembly Bay 1</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">DELIVERY</span>
                          <span className="font-bold text-zinc-900">Steel Rod (STEEL-001)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-purple-700">-20 KG</span>
                          <span className="text-[10px] text-zinc-400 block font-sans">Assembly Bay 1</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">ADJUSTMENT</span>
                          <span className="font-bold text-zinc-900">Steel Rod (STEEL-001)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-700">-3 KG (Count: 67)</span>
                          <span className="text-[10px] text-zinc-400 block font-sans">Scrap Variance</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Ledger Verification Box (1 Column) */}
                  <div className="p-4 rounded-xl bg-black text-white space-y-4 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Immutable Ledger Proof
                      </span>
                      <h4 className="text-sm font-black text-white mt-1">Steel Rod Formula</h4>
                      <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs space-y-1.5 text-zinc-300">
                        <div className="flex justify-between"><span>Receipt REC-00001:</span><span className="text-emerald-400">+100 KG</span></div>
                        <div className="flex justify-between"><span>Transfer TRF-00001:</span><span className="text-sky-400">0 Net</span></div>
                        <div className="flex justify-between"><span>Delivery DEL-00001:</span><span className="text-purple-400">-20 KG</span></div>
                        <div className="flex justify-between"><span>Adjustment ADJ-00001:</span><span className="text-amber-400">-3 KG</span></div>
                        <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-white">
                          <span>Verified Total:</span>
                          <span className="text-emerald-400">77 KG</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Database matches Ledger exactly (77 KG)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 3. PROBLEM SECTION */}
      {/* -------------------------------------------------- */}
      <section id="problem" className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Operational Reality</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight leading-tight">
              Inventory becomes difficult when movement becomes invisible.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="text-xs font-mono font-black text-black px-2.5 py-1 rounded bg-zinc-200 inline-block">WHERE?</span>
              <h3 className="text-base font-bold text-black">Multi-Location Scrutiny</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Inventory lives across warehouses, zones, racks, and production floors. Without location context, physical items get lost.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="text-xs font-mono font-black text-black px-2.5 py-1 rounded bg-zinc-200 inline-block">WHAT?</span>
              <h3 className="text-base font-bold text-black">Movement Clarity</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Teams struggle to answer basic operational questions: What arrived today? What was delivered? What moved to assembly?
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="text-xs font-mono font-black text-black px-2.5 py-1 rounded bg-zinc-200 inline-block">WHEN?</span>
              <h3 className="text-base font-bold text-black">Continuous History</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Stock changes happen continuously. Without an immutable timestamped log, manual spreadsheet reconciliations quickly break.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <span className="text-xs font-mono font-black text-black px-2.5 py-1 rounded bg-zinc-200 inline-block">WHO?</span>
              <h3 className="text-base font-bold text-black">Operational Accountability</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Every stock mutation needs an owner. Who created the receipt? Who validated the transfer? Who confirmed the physical count?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 4. CORE VALUE SECTION (SYSTEM FLOW DIAGRAM) */}
      {/* -------------------------------------------------- */}
      <section id="product" className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Transactional Architecture</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              One system. One inventory record.
            </p>
            <p className="text-sm text-zinc-600 font-medium">
              Every operation follows a strict transactional pipeline enforced inside PostgreSQL database transactions.
            </p>
          </div>

          {/* Central Flow Diagram Visual */}
          <div className="bg-white border border-zinc-300 rounded-2xl p-6 sm:p-10 shadow-lg max-w-5xl mx-auto overflow-x-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-[640px] text-center font-mono">
              {/* Node 1 */}
              <div className="flex-1 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 w-full">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 01
                </span>
                <p className="text-sm font-black text-black">RECEIPT</p>
                <p className="text-[11px] text-zinc-500 font-sans">Supplier Inbound (+Stock)</p>
              </div>

              <div className="text-zinc-400 font-bold rotate-90 md:rotate-0">→</div>

              {/* Node 2 */}
              <div className="flex-1 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 w-full">
                <span className="text-[10px] font-extrabold uppercase text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Step 02
                </span>
                <p className="text-sm font-black text-black">TRANSFER</p>
                <p className="text-[11px] text-zinc-500 font-sans">Inter-Location Movement</p>
              </div>

              <div className="text-zinc-400 font-bold rotate-90 md:rotate-0">→</div>

              {/* Node 3 */}
              <div className="flex-1 p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 w-full">
                <span className="text-[10px] font-extrabold uppercase text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Step 03
                </span>
                <p className="text-sm font-black text-black">DELIVERY</p>
                <p className="text-[11px] text-zinc-500 font-sans">Customer Outbound (-Stock)</p>
              </div>

              <div className="text-zinc-400 font-bold rotate-90 md:rotate-0">→</div>

              {/* Node 4 */}
              <div className="flex-1 p-4 rounded-xl bg-black text-white space-y-1.5 w-full shadow-md">
                <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Step 04
                </span>
                <p className="text-sm font-black text-white">STOCK LEDGER</p>
                <p className="text-[11px] text-zinc-400 font-sans">Immutable History Log</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 5. TRANSACTION STORY SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Transaction Evidence</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Every movement leaves a trail.
            </p>
            <p className="text-sm text-zinc-600 font-medium">
              When inventory changes, StockSense records exact quantity state before, quantity change, quantity after, reference document, user ID, and timestamp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Receipt Transaction */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  RECEIPT (REC-00001)
                </span>
                <span className="text-zinc-400">10:42 AM</span>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-sm text-black font-sans">Steel Rod (STEEL-001)</p>
                <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-white border border-zinc-200">
                  <div><span className="text-[10px] text-zinc-400 block uppercase">Before</span><span className="font-bold">0 KG</span></div>
                  <div><span className="text-[10px] text-zinc-400 block uppercase">Change</span><span className="font-bold text-emerald-600">+100 KG</span></div>
                  <div><span className="text-[10px] text-zinc-400 block uppercase">After</span><span className="font-bold">100 KG</span></div>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 font-sans flex justify-between pt-1">
                <span>Location: Raw Material Rack A</span>
                <span>User: Alex Rivera (Manager)</span>
              </div>
            </div>

            {/* Card 2: Transfer Transaction */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
                <span className="px-2.5 py-1 rounded bg-sky-100 text-sky-800 font-bold border border-sky-200">
                  TRANSFER (TRF-00001)
                </span>
                <span className="text-zinc-400">11:15 AM</span>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-sm text-black font-sans">Steel Rod (STEEL-001)</p>
                <div className="grid grid-cols-2 gap-3 text-center p-3 rounded-xl bg-white border border-zinc-200">
                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Source (Rack A)</span>
                    <span className="font-bold text-red-600">100 → 70 KG (-30)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 block uppercase">Destination (Assembly)</span>
                    <span className="font-bold text-emerald-600">0 → 30 KG (+30)</span>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-zinc-500 font-sans flex justify-between pt-1">
                <span>Total Company Stock Preserved</span>
                <span>Net System Quantity: 100 KG</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 6. LEDGER SECTION */}
      {/* -------------------------------------------------- */}
      <section id="ledger" className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Audit Trail Integrity</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Your inventory history, without the guesswork.
            </p>
            <p className="text-sm text-zinc-600 font-medium">
              The Stock Ledger is historical evidence. Normal application users cannot edit or delete ledger entries.
            </p>
          </div>

          {/* Ledger UI Table Preview */}
          <div className="bg-white border border-zinc-300 rounded-2xl shadow-lg overflow-hidden font-sans">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-100 border-b border-zinc-200 text-zinc-600 uppercase font-extrabold">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Product</th>
                    <th className="py-3.5 px-4">SKU</th>
                    <th className="py-3.5 px-4">Operation</th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4 text-right">Before</th>
                    <th className="py-3.5 px-4 text-right">Change</th>
                    <th className="py-3.5 px-4 text-right">After</th>
                    <th className="py-3.5 px-4">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-900">
                  <tr className="hover:bg-zinc-50">
                    <td className="py-3 px-4 font-sans text-zinc-500">10:42 AM</td>
                    <td className="py-3 px-4 font-bold font-sans">Steel Rod</td>
                    <td className="py-3 px-4 text-zinc-500">STEEL-001</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">RECEIPT</span></td>
                    <td className="py-3 px-4 font-bold">REC-00001</td>
                    <td className="py-3 px-4 text-right">0.00</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">+100.00</td>
                    <td className="py-3 px-4 text-right font-bold">100.00</td>
                    <td className="py-3 px-4 font-sans text-zinc-600">Alex Rivera</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="py-3 px-4 font-sans text-zinc-500">11:15 AM</td>
                    <td className="py-3 px-4 font-bold font-sans">Steel Rod</td>
                    <td className="py-3 px-4 text-zinc-500">STEEL-001</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">TRANSFER_OUT</span></td>
                    <td className="py-3 px-4 font-bold">TRF-00001</td>
                    <td className="py-3 px-4 text-right">100.00</td>
                    <td className="py-3 px-4 text-right font-bold text-red-600">-30.00</td>
                    <td className="py-3 px-4 text-right font-bold">70.00</td>
                    <td className="py-3 px-4 font-sans text-zinc-600">Alex Rivera</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="py-3 px-4 font-sans text-zinc-500">11:15 AM</td>
                    <td className="py-3 px-4 font-bold font-sans">Steel Rod</td>
                    <td className="py-3 px-4 text-zinc-500">STEEL-001</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">TRANSFER_IN</span></td>
                    <td className="py-3 px-4 font-bold">TRF-00001</td>
                    <td className="py-3 px-4 text-right">0.00</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">+30.00</td>
                    <td className="py-3 px-4 text-right font-bold">30.00</td>
                    <td className="py-3 px-4 font-sans text-zinc-600">Alex Rivera</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="py-3 px-4 font-sans text-zinc-500">01:30 PM</td>
                    <td className="py-3 px-4 font-bold font-sans">Steel Rod</td>
                    <td className="py-3 px-4 text-zinc-500">STEEL-001</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">DELIVERY</span></td>
                    <td className="py-3 px-4 font-bold">DEL-00001</td>
                    <td className="py-3 px-4 text-right">30.00</td>
                    <td className="py-3 px-4 text-right font-bold text-purple-700">-20.00</td>
                    <td className="py-3 px-4 text-right font-bold">10.00</td>
                    <td className="py-3 px-4 font-sans text-zinc-600">Alex Rivera</td>
                  </tr>
                  <tr className="hover:bg-zinc-50">
                    <td className="py-3 px-4 font-sans text-zinc-500">02:10 PM</td>
                    <td className="py-3 px-4 font-bold font-sans">Steel Rod</td>
                    <td className="py-3 px-4 text-zinc-500">STEEL-001</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">ADJUSTMENT</span></td>
                    <td className="py-3 px-4 font-bold">ADJ-00001</td>
                    <td className="py-3 px-4 text-right">70.00</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700">-3.00</td>
                    <td className="py-3 px-4 text-right font-bold">67.00</td>
                    <td className="py-3 px-4 font-sans text-zinc-600">Alex Rivera</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 7. MULTI-WAREHOUSE LOCATION SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Hierarchical Control</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Know where your stock is.
            </p>
            <p className="text-sm text-zinc-600 font-medium">
              StockSense manages locations at the sub-warehouse level. Organize by Storage, Production, and Dispatch areas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Warehouse 1 */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-black">Main Warehouse</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">MW-01</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white border border-zinc-200 flex justify-between">
                  <span>Main Storage (MS-01)</span>
                  <span className="font-bold text-black">Bearing: 200 PCS</span>
                </div>
              </div>
            </div>

            {/* Warehouse 2 */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-black">Raw Material Store</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">RMS-01</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white border border-zinc-200 flex justify-between">
                  <span>Raw Rack A (RMA-01)</span>
                  <span className="font-bold text-black">Steel Rod: 67 KG</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-zinc-200 flex justify-between">
                  <span>Raw Rack A (RMA-01)</span>
                  <span className="font-bold text-black">Copper Wire: 150 M</span>
                </div>
              </div>
            </div>

            {/* Warehouse 3 */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-black">Finished Goods</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">FG-01</span>
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white border border-zinc-200 flex justify-between">
                  <span>Assembly Bay 1 (AB1-01)</span>
                  <span className="font-bold text-black">Steel Rod: 10 KG</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 8. OPERATIONS SECTION */}
      {/* -------------------------------------------------- */}
      <section id="features" className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Core Capabilities</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Four fundamental operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-black">RECEIPTS</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Record incoming supplier deliveries. Validating a receipt updates location inventory and writes a ledger entry.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-black">TRANSFERS</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Move stock between locations or warehouses. Conserves total system stock while recording dual ledger events.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-black">DELIVERIES</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Fulfill customer orders. Validates available location stock to prevent negative inventory allocations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-black">ADJUSTMENTS</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Reconcile physical stock counts with recorded database stock. Captures scrap, damage, and audit differences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 9. SECURITY & RBAC SECTION */}
      {/* -------------------------------------------------- */}
      <section id="security" className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-white">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Security Architecture</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Inventory data should be accountable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <ShieldCheck className="w-6 h-6 text-black" />
              <h3 className="text-sm font-extrabold text-black">Role-Based Access Control</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Enforces strict separation between <code className="bg-zinc-200 px-1 rounded text-[11px]">INVENTORY_MANAGER</code> and <code className="bg-zinc-200 px-1 rounded text-[11px]">WAREHOUSE_STAFF</code> permissions on server endpoints.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <Lock className="w-6 h-6 text-black" />
              <h3 className="text-sm font-extrabold text-black">Transactional Updates</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                PostgreSQL transactions wrap all stock mutations with row-level locks, shielding against double validation or race conditions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <History className="w-6 h-6 text-black" />
              <h3 className="text-sm font-extrabold text-black">Redacted Audit Log</h3>
              <p className="text-xs text-zinc-600 leading-relaxed font-medium">
                Captures system events while automatically stripping sensitive parameters (passwords, OTP hashes, JWT secrets) from logs.
              </p>
            </div>
          </div>

          {/* Role Comparison Table */}
          <div className="pt-6">
            <h3 className="text-base font-extrabold text-black mb-4">Application Roles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-zinc-900 text-white space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                  Manager Role
                </span>
                <h4 className="text-lg font-black text-white">INVENTORY_MANAGER</h4>
                <ul className="space-y-2 text-xs text-zinc-300 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Full operational validation authority</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Manage categories, warehouses, locations & suppliers</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> View full Stock Ledger and Security Audit Logs</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Export CSV datasets & trigger demo seeds</li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-300 space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-700 bg-zinc-200 px-2 py-0.5 rounded border border-zinc-300">
                  Staff Role
                </span>
                <h4 className="text-lg font-black text-black">WAREHOUSE_STAFF</h4>
                <ul className="space-y-2 text-xs text-zinc-600 font-medium">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0" /> Create and draft receipts, deliveries & transfers</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0" /> View real-time stock levels across warehouses</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0" /> Execute permitted operational inventory tasks</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0" /> Restricted from administrative system configuration</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 10. HOW IT WORKS (4 STEPS) */}
      {/* -------------------------------------------------- */}
      <section id="how-it-works" className="py-16 lg:py-24 px-4 lg:px-8 border-b border-zinc-200 bg-zinc-50">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">Operational Process</h2>
            <p className="text-3xl sm:text-4xl font-black text-black tracking-tight">
              Simple 4-step workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3">
              <span className="text-xl font-black text-black font-mono">01</span>
              <h3 className="text-sm font-extrabold text-black">SET UP</h3>
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Define Products (SKUs, reorder thresholds), Warehouses, Locations (Storage, Production), and Suppliers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3">
              <span className="text-xl font-black text-black font-mono">02</span>
              <h3 className="text-sm font-extrabold text-black">RECEIVE</h3>
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Log inbound supplier receipts. Validation increases location stock and generates an auditable receipt ledger entry.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3">
              <span className="text-xl font-black text-black font-mono">03</span>
              <h3 className="text-sm font-extrabold text-black">MOVE</h3>
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Transfer inventory between locations. Source stock decreases while destination stock increases atomically.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-zinc-200 space-y-3">
              <span className="text-xl font-black text-black font-mono">04</span>
              <h3 className="text-sm font-extrabold text-black">TRACK</h3>
              <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                Fulfill deliveries, reconcile physical counts with adjustments, and view complete stock ledger and security logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 11. FINAL CTA SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-20 px-4 lg:px-8 bg-black text-white text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Bring every inventory movement into one system.
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Track stock across warehouses, validate operations, and keep a complete history of what changed, when, and why.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 text-sm font-extrabold text-black bg-white hover:bg-zinc-100 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Open StockSense</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition-colors text-center"
            >
              Sign In to Demo Account
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 12. FOOTER */}
      {/* -------------------------------------------------- */}
      <footer className="mt-auto border-t border-zinc-200 bg-white px-4 lg:px-8 py-10 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-black">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-black tracking-tight">StockSense IMS</span>
              <p className="text-[11px] text-zinc-500">Inventory management with transactional accuracy and auditability.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-bold text-zinc-700">
            <a href="#product" className="hover:text-black">Product</a>
            <a href="#features" className="hover:text-black">Features</a>
            <a href="#security" className="hover:text-black">Security</a>
            <Link href="/dashboard" className="hover:text-black">Dashboard</Link>
            <a
              href="https://github.com/Jilpatel18/Stock-Sense"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-black"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>GitHub Repo</span>
            </a>

          </div>

          <div className="text-[11px] font-mono text-zinc-400">
            © 2026 StockSense. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
