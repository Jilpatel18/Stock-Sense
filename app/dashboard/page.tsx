"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import {
  Boxes,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  Plus,
  Filter,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filters
  const [docType, setDocType] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [docType, status, selectedLocation, selectedCategory]);

  const fetchMetadata = async () => {
    try {
      const [locRes, catRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/categories"),
      ]);
      if (locRes.ok) {
        const d = await locRes.json();
        setLocations(d.locations || []);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (docType !== "All") params.append("doc_type", docType);
      if (status !== "All") params.append("status", status);
      if (selectedLocation !== "All") params.append("location_id", selectedLocation);
      if (selectedCategory !== "All") params.append("category_id", selectedCategory);

      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDocument = async (doc: any) => {
    setValidatingId(`${doc.type}-${doc.id}`);
    setActionMessage(null);

    let endpoint = "";
    if (doc.type === "Receipt") endpoint = `/api/operations/receipts/${doc.id}/validate`;
    else if (doc.type === "Delivery") endpoint = `/api/operations/deliveries/${doc.id}/validate`;
    else if (doc.type === "Internal") endpoint = `/api/operations/transfers/${doc.id}/validate`;
    else if (doc.type === "Adjustment") endpoint = `/api/operations/adjustments/${doc.id}/validate`;

    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(data.message);
        setTimeout(() => setActionMessage(null), 4000);
        fetchStats();
      } else {
        alert("Validation error: " + (data.error || "Failed to validate document"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setValidatingId(null);
    }
  };

  const kpis = stats?.kpis || {
    totalProducts: 0,
    lowStockCount: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    scheduledTransfers: 0,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            Operations Dashboard
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Real-time multi-warehouse inventory status & operational controls
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/operations/receipts?new=true"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Receipt
          </Link>
          <Link
            href="/operations/deliveries?new=true"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Delivery
          </Link>
          <Link
            href="/operations/transfers?new=true"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Transfer
          </Link>
          <Link
            href="/operations/adjustments?new=true"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Adjustment
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-black text-white text-xs font-medium flex items-center justify-between shadow-md animate-in fade-in">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-white" />
            {actionMessage}
          </span>
          <span className="text-[10px] text-zinc-300 font-mono">Stock Ledger Updated</span>
        </div>
      )}

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Products */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Total Products</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.totalProducts}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Active catalog items with stock</p>
          </div>
        </div>

        {/* KPI 2: Low Stock */}
        <div
          className={`bg-white border rounded-2xl p-4 flex flex-col justify-between transition-colors shadow-sm ${
            kpis.lowStockCount > 0 ? "border-black bg-zinc-50/80" : "border-zinc-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Low Stock / Out</span>
            <div className={`p-2 rounded-xl ${kpis.lowStockCount > 0 ? "bg-black text-white font-bold animate-pulse" : "bg-zinc-100 text-zinc-500"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-extrabold tracking-tight text-zinc-950">
              {kpis.lowStockCount}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">At or below reorder threshold</p>
          </div>
        </div>

        {/* KPI 3: Pending Receipts */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Pending Receipts</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.pendingReceipts}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Incoming goods awaiting validation</p>
          </div>
        </div>

        {/* KPI 4: Pending Deliveries */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Pending Deliveries</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.pendingDeliveries}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Outgoing customer orders</p>
          </div>
        </div>

        {/* KPI 5: Internal Transfers */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Scheduled Transfers</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.scheduledTransfers}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Inter-location movements</p>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner if applicable */}
      {stats?.lowStockItems?.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-300 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-black" />
              Low Stock Alert Triggered ({stats.lowStockItems.length} products)
            </h3>
            <Link href="/products?filter=low" className="text-xs text-zinc-700 hover:text-black font-semibold underline">
              View All Low Stock
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {stats.lowStockItems.map((item: any) => (
              <div key={item.id} className="bg-white border border-zinc-200 rounded-xl p-2.5 flex justify-between items-center text-xs shadow-sm">
                <div>
                  <p className="font-bold text-zinc-950">{item.name}</p>
                  <p className="text-[10px] text-zinc-500 font-mono">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-zinc-950">{item.current_stock}</span>
                  <span className="text-[10px] text-zinc-500 block">Reorder: {item.reorder_level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Filters Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-900" /> Dynamic Document Filters
          </span>
          <button
            onClick={() => {
              setDocType("All");
              setStatus("All");
              setSelectedLocation("All");
              setSelectedCategory("All");
            }}
            className="text-[11px] text-zinc-500 hover:text-zinc-900 font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Doc Type Filter */}
          <div>
            <label className="block text-[11px] text-zinc-600 mb-1 font-medium">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="All">All Document Types</option>
              <option value="Receipts">Receipts (Incoming)</option>
              <option value="Delivery">Delivery Orders (Outgoing)</option>
              <option value="Internal">Internal Transfers</option>
              <option value="Adjustments">Inventory Adjustments</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] text-zinc-600 mb-1 font-medium font-sans">Document Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Waiting">Waiting</option>
              <option value="Ready">Ready</option>
              <option value="Done">Done</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          {/* Warehouse / Location Filter */}
          <div>
            <label className="block text-[11px] text-zinc-600 mb-1 font-medium">Warehouse / Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="All">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.warehouse_name} → {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>

          {/* Product Category Filter */}
          <div>
            <label className="block text-[11px] text-zinc-600 mb-1 font-medium">Product Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Operations Feed Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-950">Operational Documents</h2>
            <p className="text-[11px] text-zinc-600">
              Showing filtered operations feed. Validate ready documents to post stock changes.
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="text-zinc-500 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Reference No.</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Location / Warehouse</th>
                <th className="px-4 py-3">Partner / Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Loading inventory documents...
                  </td>
                </tr>
              ) : stats?.documents?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No documents matching the active filter criteria.
                  </td>
                </tr>
              ) : (
                stats?.documents?.map((doc: any) => {
                  const isValidating = validatingId === `${doc.type}-${doc.id}`;
                  return (
                    <tr key={`${doc.type}-${doc.id}`} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-zinc-950">
                        {doc.reference}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-800">
                          {doc.type === "Receipt" && <ArrowDownRight className="w-3.5 h-3.5 text-zinc-500" />}
                          {doc.type === "Delivery" && <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />}
                          {doc.type === "Internal" && <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500" />}
                          {doc.type === "Adjustment" && <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />}
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-950">{doc.location_name}</span>
                        <span className="text-[10px] text-zinc-500 block">{doc.warehouse_name}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {doc.partner_or_reason || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={doc.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                        {new Date(doc.created_at).toLocaleDateString()}{" "}
                        {new Date(doc.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {doc.status !== "Done" && doc.status !== "Canceled" ? (
                          <button
                            onClick={() => handleValidateDocument(doc)}
                            disabled={isValidating}
                            className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-sm transition-all disabled:opacity-50"
                          >
                            {isValidating ? "Validating..." : "Validate & Post"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-zinc-500 font-mono">Posted</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
