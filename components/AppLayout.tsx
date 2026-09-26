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
  Tag,
  Edit2,
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

  // Global Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

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

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery.trim());
    } else {
      setSearchResults(null);
      setShowSearchDropdown(false);
    }
  }, [searchQuery]);

  const performSearch = async (q: string) => {
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results);
        setShowSearchDropdown(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  };

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

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");

  if (isPublicPage) {
    return <div className="min-h-screen bg-white text-zinc-950 font-sans">{children}</div>;
  }


  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
    { name: "Categories", href: "/categories", icon: Tag },
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
  ];

  const hasSearchHits =
    searchResults &&
    (searchResults.products?.length > 0 ||
      searchResults.warehouses?.length > 0 ||
      searchResults.locations?.length > 0 ||
      searchResults.receipts?.length > 0 ||
      searchResults.deliveries?.length > 0 ||
      searchResults.transfers?.length > 0);

  return (
    <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans selection:bg-black selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-zinc-600 hover:text-black p-1"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
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

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowSearchDropdown(true);
              }}
              placeholder="Global Search (Product, SKU, Warehouse, Location, Receipt, Delivery)..."
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-1.5 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
            />
            {searchLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-mono">
                ...
              </span>
            )}
          </div>

          {/* Search Dropdown Popover */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50 p-2 text-xs space-y-3">
              {!hasSearchHits ? (
                <p className="p-3 text-center text-zinc-500 text-[11px]">
                  {searchLoading ? "Searching database..." : `No results found for "${searchQuery}"`}
                </p>
              ) : (
                <>
                  {/* Products */}
                  {searchResults.products?.length > 0 && (
                    <div>
                      <span className="px-2 text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Products
                      </span>
                      {searchResults.products.map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <span className="font-bold text-zinc-950">{p.name}</span>
                          <span className="font-mono text-[10px] text-zinc-500">SKU: {p.sku}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Warehouses */}
                  {searchResults.warehouses?.length > 0 && (
                    <div>
                      <span className="px-2 text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Warehouses
                      </span>
                      {searchResults.warehouses.map((w: any) => (
                        <Link
                          key={w.id}
                          href="/warehouses"
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <span className="font-bold text-zinc-950">{w.name}</span>
                          <span className="font-mono text-[10px] text-zinc-500">({w.code})</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Locations */}
                  {searchResults.locations?.length > 0 && (
                    <div>
                      <span className="px-2 text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Locations
                      </span>
                      {searchResults.locations.map((l: any) => (
                        <Link
                          key={l.id}
                          href="/warehouses"
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <span className="font-bold text-zinc-950">{l.name}</span>
                          <span className="font-mono text-[10px] text-zinc-500">
                            {l.warehouse_name} ({l.code})
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Receipts */}
                  {searchResults.receipts?.length > 0 && (
                    <div>
                      <span className="px-2 text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Receipts
                      </span>
                      {searchResults.receipts.map((r: any) => (
                        <Link
                          key={r.id}
                          href="/operations/receipts"
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <span className="font-mono font-bold text-zinc-950">{r.reference}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{r.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Deliveries */}
                  {searchResults.deliveries?.length > 0 && (
                    <div>
                      <span className="px-2 text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Deliveries
                      </span>
                      {searchResults.deliveries.map((d: any) => (
                        <Link
                          key={d.id}
                          href="/operations/deliveries"
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <span className="font-mono font-bold text-zinc-950">{d.reference}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{d.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Transfers */}
                  {searchResults.transfers?.length > 0 && (
                    <div>
                      <span className="px-2 text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Transfers
                      </span>
                      {searchResults.transfers.map((t: any) => (
                        <Link
                          key={t.id}
                          href="/operations/transfers"
                          onClick={() => setShowSearchDropdown(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <span className="font-mono font-bold text-zinc-950">{t.reference}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{t.status}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSeedData}
            disabled={seeding}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-extrabold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-sm transition-all disabled:opacity-50"
            title="Pre-fill database with sample products, warehouses, and operations"
          >
            <Sparkles className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </button>
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

            {/* System Nav */}
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

          {/* Sidebar Footer User Card */}
          <div className="p-3.5 border-t border-zinc-200 bg-white">
            {user ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-50 border border-zinc-200/80">
                  <div className="w-8 h-8 rounded-full bg-black text-white font-black flex items-center justify-center text-xs uppercase shrink-0">
                    {user.name ? user.name.charAt(0) : "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-zinc-950 truncate leading-tight">{user.name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono font-medium truncate">
                      {user.role === "INVENTORY_MANAGER" ? "Inventory Manager" : "Warehouse Staff"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 font-bold rounded-lg bg-zinc-100 text-zinc-800 hover:bg-black hover:text-white transition-colors border border-zinc-200/70"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 font-bold rounded-lg bg-zinc-100 text-zinc-800 hover:bg-black hover:text-white transition-colors border border-zinc-200/70"
                    title="Logout"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold rounded-xl bg-black text-white hover:bg-zinc-800 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Log In</span>
              </Link>
            )}
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
