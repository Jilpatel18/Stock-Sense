"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Search,
} from "lucide-react";

interface UserType {
  id: number;
  name: string;
  email: string;
  role: string;
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const localPart = email.trim().split("@")[0];
    return localPart.slice(0, 2).toUpperCase();
  }
  return "US";
}

export function formatRole(role?: string): string {
  if (!role) return "User";
  if (role === "INVENTORY_MANAGER") return "Inventory Manager";
  if (role === "WAREHOUSE_STAFF") return "Warehouse Staff";
  return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Global Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    setShowUserDropdown(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUserDropdown(false);
        setShowSearchDropdown(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout request error", err);
    } finally {
      setUser(null);
      router.push("/login");
      router.refresh();
    }
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
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  useEffect(() => {
    if (!isPublicPage && !loading && !user) {
      const safePath = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname : "/dashboard";
      router.push(`/login?redirect=${encodeURIComponent(safePath)}`);
    }
  }, [isPublicPage, loading, user, pathname, router]);

  if (isPublicPage) {
    return <div className="min-h-screen bg-white text-zinc-950 font-sans">{children}</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-zinc-950 flex flex-col font-sans">
        <header className="bg-white border-b border-zinc-200 px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-200 animate-pulse" />
            <div className="w-28 h-5 rounded bg-zinc-200 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-8 rounded-xl bg-zinc-100 animate-pulse" />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-500 font-medium">Verifying session...</p>
          </div>
        </div>
      </div>
    );
  }

  const overviewItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  ];

  const catalogItems = [
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

  const locationItems = [
    { name: "Warehouses & Locations", href: "/warehouses", icon: Warehouse },
  ];

  const systemItems = [
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
            className="lg:hidden text-zinc-600 hover:text-black p-1 rounded-lg hover:bg-zinc-100"
            aria-label="Toggle navigation drawer"
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
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setShowSearchDropdown(true);
              }}
              placeholder="Search inventory (Product, SKU, Warehouse)..."
              className="w-full bg-zinc-50/90 border border-zinc-200/90 rounded-xl text-xs text-zinc-950 pl-8.5 pr-12 py-1.5 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400 font-medium transition-colors"
            />
            {searchLoading ? (
              <span className="absolute right-3 text-[10px] text-zinc-400 font-mono animate-pulse">
                ...
              </span>
            ) : (
              <span className="absolute right-2.5 px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-600 font-mono text-[10px] font-extrabold pointer-events-none border border-zinc-300/50">
                ⌘K
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

        {/* Action Controls & Top-Right User Profile Header */}
        <div className="flex items-center gap-3 shrink-0">

          {user ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                aria-expanded={showUserDropdown}
                aria-haspopup="true"
                aria-label={`Open account menu for ${user.name || user.email}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-black text-white font-black flex items-center justify-center text-xs uppercase shadow-sm shrink-0">
                  {getInitials(user.name, user.email)}
                </div>
                <span className="font-bold text-xs text-zinc-950 max-w-[130px] sm:max-w-[170px] truncate hidden sm:inline-block">
                  {user.name || (user.email ? user.email.split("@")[0] : "User")}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-150 ${
                    showUserDropdown ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu Popover */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-black text-white font-black flex items-center justify-center text-xs uppercase shrink-0">
                        {getInitials(user.name, user.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-zinc-950 truncate">{user.name || user.email}</p>
                        <p className="text-[10px] text-zinc-500 font-mono font-medium truncate mt-0.5">
                          {formatRole(user.role)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4 text-zinc-500" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-zinc-700 hover:text-black hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 text-zinc-500" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="border-t border-zinc-200 pt-1 mt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-extrabold rounded-xl bg-black text-white hover:bg-zinc-800 transition-colors shadow-sm"
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
            {/* OVERVIEW Nav */}
            <div>
              <p className="px-3 text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">
                Overview
              </p>
              <nav className="space-y-1">
                {overviewItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white font-extrabold shadow-xs"
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

            {/* CATALOG Nav */}
            <div>
              <p className="px-3 text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">
                Catalog
              </p>
              <nav className="space-y-1">
                {catalogItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white font-extrabold shadow-xs"
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

            {/* OPERATIONS Nav */}
            <div>
              <div
                onClick={() => setOperationsOpen(!operationsOpen)}
                className="px-3 flex items-center justify-between text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5 cursor-pointer hover:text-black"
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
                            ? "bg-black text-white font-extrabold shadow-xs"
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

            {/* LOCATION Nav */}
            <div>
              <p className="px-3 text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">
                Location
              </p>
              <nav className="space-y-1">
                {locationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white font-extrabold shadow-xs"
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

            {/* SYSTEM Nav */}
            <div>
              <p className="px-3 text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-1.5">
                System
              </p>
              <nav className="space-y-1">
                {systemItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
                        isActive
                          ? "bg-black text-white font-extrabold shadow-xs"
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
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
