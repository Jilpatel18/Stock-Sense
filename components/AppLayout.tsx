"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse,
  User,
  LogOut,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Settings,
  ShieldAlert,
} from "lucide-react";

interface UserType {
  id: number;
  name: string;
  email: string;
  role: string;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [seedNotification, setSeedNotification] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSeedNotification("Demo data seeded successfully!");
        setTimeout(() => setSeedNotification(null), 4000);
        window.location.reload();
      } else {
        alert("Failed to seed: " + data.error);
      }
    } catch (err: any) {
      alert("Error seeding data: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  if (isAuthPage) {
    return <div className="min-h-screen bg-white text-zinc-950 font-sans">{children}</div>;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
  ];

  const operationsItems = [
    { name: "Receipts (Incoming)", href: "/operations/receipts", icon: ArrowDownRight },
    { name: "Delivery Orders (Outgoing)", href: "/operations/deliveries", icon: ArrowUpRight },
    { name: "Internal Transfers", href: "/operations/transfers", icon: ArrowLeftRight },
    { name: "Inventory Adjustment", href: "/operations/adjustments", icon: SlidersHorizontal },
    { name: "Stock Ledger / History", href: "/operations/history", icon: History },
  ];

  const secondaryItems = [
    { name: "Warehouses & Locations", href: "/warehouses", icon: Warehouse },
    { name: "Settings Module", href: "/settings", icon: Settings },
    { name: "Security Audit Log", href: "/audit-logs", icon: ShieldAlert },
    { name: "My Profile", href: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 lg:px-8 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-zinc-600 hover:text-black p-1"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
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
        </div>

        {/* Action Controls & Profile Pill */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-sm transition-all disabled:opacity-50"
            title="Pre-fill database with sample products, warehouses, and operations"
          >
            <Sparkles className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>

          {user ? (
            <div className="flex items-center gap-3 bg-zinc-100 border border-zinc-200 rounded-xl px-3 py-1.5">
              <div className="w-7 h-7 rounded-full bg-black text-white font-extrabold flex items-center justify-center text-xs uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-bold text-black leading-tight">{user.name}</p>
                <p className="text-[10px] text-zinc-600 font-mono font-medium">
                  {user.role === "INVENTORY_MANAGER" ? "Inventory Manager" : "Warehouse Staff"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-zinc-500 hover:text-black p-1 rounded-lg hover:bg-zinc-200 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors"
            >
              Log In
            </Link>
          )}
        </div>
      </header>

      {seedNotification && (
        <div className="bg-black border-b border-zinc-800 text-white px-4 py-2 text-center text-xs font-bold animate-in fade-in">
          {seedNotification}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-zinc-50/80 border-r border-zinc-200 flex flex-col transition-transform duration-200 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-4 flex-1 overflow-y-auto space-y-6">
            {/* Main Nav */}
            <div>
              <p className="px-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Main
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white font-extrabold shadow-sm"
                          : "text-zinc-600 hover:text-black hover:bg-zinc-200/70"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Operations Collapsible */}
            <div>
              <div
                onClick={() => setOperationsOpen(!operationsOpen)}
                className="px-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 cursor-pointer hover:text-black"
              >
                <span>Operations</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${operationsOpen ? "rotate-180" : ""}`}
                />
              </div>
              {operationsOpen && (
                <nav className="space-y-1 pl-1">
                  {operationsItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                          isActive
                            ? "bg-black text-white font-extrabold shadow-sm"
                            : "text-zinc-600 hover:text-black hover:bg-zinc-200/70"
                        }`}
                      >
                        <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>

            {/* Management & Profile */}
            <div>
              <p className="px-3 text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                System
              </p>
              <nav className="space-y-1">
                {secondaryItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white font-extrabold shadow-sm"
                          : "text-zinc-600 hover:text-black hover:bg-zinc-200/70"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer info */}
          <div className="p-4 border-t border-zinc-200 bg-white text-[11px] text-zinc-500 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Database</span>
              <span className="inline-flex items-center gap-1 text-black font-mono font-bold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                Neon Postgres
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Ledger Status</span>
              <span className="text-zinc-700 font-mono text-[10px] font-bold">Atomic Audit</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
