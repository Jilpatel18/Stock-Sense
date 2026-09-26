"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import ValidationPreviewModal from "@/components/ValidationPreviewModal";
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
  Warehouse,
  Activity,
  PieChart,
  XCircle,
  PackageCheck,
  TrendingUp,
  History,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

export default function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Validation Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Movement timeframe toggle ('7' or '30')
  const [movementDays, setMovementDays] = useState<"7" | "30">("7");

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
      if (locRes.ok) setLocations((await locRes.json()).locations || []);
      if (catRes.ok) setCategories((await catRes.json()).categories || []);
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

  const handleOpenValidationModal = (doc: any) => {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
  };

  const handleExecuteValidation = async () => {
    if (!previewDoc) return;

    let endpoint = "";
    if (previewDoc.type === "Receipt") endpoint = `/api/operations/receipts/${previewDoc.id}/validate`;
    else if (previewDoc.type === "Delivery") endpoint = `/api/operations/deliveries/${previewDoc.id}/validate`;
    else if (previewDoc.type === "Internal") endpoint = `/api/operations/transfers/${previewDoc.id}/validate`;
    else if (previewDoc.type === "Adjustment") endpoint = `/api/operations/adjustments/${previewDoc.id}/validate`;

    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      const msg = data.message || `Operation ${previewDoc.reference} validated successfully!`;
      setActionMessage(msg);
      toast.success(msg);
      setTimeout(() => setActionMessage(null), 4000);
      fetchStats();
    } else {
      const errMsg = data.error || "Failed to validate document.";
      toast.error(errMsg);
      throw new Error(errMsg);
    }
  };

  const kpis = stats?.kpis || {
    totalSkus: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    scheduledTransfers: 0,
    recentAdjustments: 0,
  };

  const health = stats?.inventoryHealth || {
    healthyCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    healthyPercent: 0,
    lowStockPercent: 0,
    outOfStockPercent: 0,
  };

  const movementData =
    movementDays === "7"
      ? stats?.inventoryMovement?.last7Days || { receipts: 0, deliveries: 0, transfers: 0, adjustments: 0 }
      : stats?.inventoryMovement?.last30Days || { receipts: 0, deliveries: 0, transfers: 0, adjustments: 0 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            Operations & Executive Dashboard
          </h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Real-time multi-warehouse stock health, ledger movements & operational controls
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/operations/receipts?new=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Receipt
          </Link>
          <Link
            href="/operations/deliveries?new=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Delivery
          </Link>
          <Link
            href="/operations/transfers?new=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Transfer
          </Link>
          <Link
            href="/operations/adjustments?new=true"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Adjustment
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-black text-white text-xs font-medium flex items-center justify-between shadow-md shadow-black/20 animate-in fade-in">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-white" />
            {actionMessage}
          </span>
          <span className="text-[10px] text-zinc-300 font-semibold">Ledger Updated</span>
        </div>
      )}

      {/* 8 KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total SKUs */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Total Active SKUs</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.totalSkus}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Active product master items</p>
          </div>
        </div>

        {/* KPI 2: Total Physical Stock */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Total Physical Stock</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">
              {kpis.totalStock.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Sum of all location quantities</p>
          </div>
        </div>

        {/* KPI 3: Low-Stock Products */}
        <div
          className={`border rounded-2xl p-4 flex flex-col justify-between transition-colors shadow-2xs ${
            kpis.lowStockCount > 0 ? "bg-amber-50/30 border-amber-200" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700">Low-Stock SKUs</span>
            <div
              className={`p-2 rounded-xl border ${
                kpis.lowStockCount > 0
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-zinc-100 text-zinc-500 border-zinc-200"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between">
              <p className={`text-2xl font-black tracking-tight ${kpis.lowStockCount > 0 ? "text-amber-900" : "text-zinc-950"}`}>
                {kpis.lowStockCount}
              </p>
              {kpis.lowStockCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  Reorder Alert
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">
              {kpis.lowStockCount > 0 ? "At or below reorder threshold" : "Stock levels healthy"}
            </p>
          </div>
        </div>

        {/* KPI 4: Out-of-Stock Products */}
        <div
          className={`border rounded-2xl p-4 flex flex-col justify-between transition-colors shadow-2xs ${
            kpis.outOfStockCount > 0 ? "bg-rose-50/40 border-rose-200" : "bg-white border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700">Out of Stock SKUs</span>
            <div
              className={`p-2 rounded-xl border ${
                kpis.outOfStockCount > 0
                  ? "bg-rose-100 text-rose-700 border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {kpis.outOfStockCount > 0 ? <XCircle className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between">
              <p className={`text-2xl font-black tracking-tight ${kpis.outOfStockCount > 0 ? "text-rose-700" : "text-zinc-950"}`}>
                {kpis.outOfStockCount}
              </p>
              {kpis.outOfStockCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                  Critical
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Optimal
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">
              {kpis.outOfStockCount > 0 ? "Products requiring replenishment" : "All tracked products available"}
            </p>
          </div>
        </div>

        {/* KPI 5: Pending Receipts */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Pending Receipts</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.pendingReceipts}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Incoming goods awaiting validation</p>
          </div>
        </div>

        {/* KPI 6: Pending Deliveries */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Pending Deliveries</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.pendingDeliveries}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Outgoing customer orders</p>
          </div>
        </div>

        {/* KPI 7: Pending Transfers */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Pending Transfers</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.scheduledTransfers}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Scheduled location movements</p>
          </div>
        </div>

        {/* KPI 8: Recent Adjustments */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 transition-colors shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-600">Recent Adjustments</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-900 border border-zinc-200">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-950 tracking-tight">{kpis.recentAdjustments}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Adjustments in last 30 days</p>
          </div>
        </div>
      </div>

      {/* Grid: Inventory Health & Stock by Warehouse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Section 2: INVENTORY HEALTH */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-black" />
              Inventory Health Breakdown
            </h2>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">Real Database Metrics</span>
          </div>

          <div className="space-y-4">
            {/* Real Percentage Bar */}
            <div className="w-full bg-zinc-100 rounded-xl h-5 overflow-hidden flex border border-zinc-200 p-0.5">
              <div
                style={{ width: `${health.healthyPercent}%` }}
                className="bg-black h-full rounded-l-lg transition-all duration-500"
                title={`Healthy: ${health.healthyPercent}%`}
              />
              <div
                style={{ width: `${health.lowStockPercent}%` }}
                className="bg-amber-500 h-full transition-all duration-500"
                title={`Low Stock: ${health.lowStockPercent}%`}
              />
              <div
                style={{ width: `${health.outOfStockPercent}%` }}
                className="bg-rose-500 h-full rounded-r-lg transition-all duration-500"
                title={`Out of Stock: ${health.outOfStockPercent}%`}
              />
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Healthy</span>
                <span className="text-xl font-extrabold text-zinc-950">{health.healthyPercent}%</span>
                <span className="text-[10px] text-zinc-500 block font-medium">({health.healthyCount} SKUs)</span>
              </div>
              <div className="p-3 bg-amber-50/40 border border-amber-200/80 rounded-xl">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">Low Stock</span>
                <span className="text-xl font-extrabold text-amber-900">{health.lowStockPercent}%</span>
                <span className="text-[10px] text-amber-700/80 block font-medium">({health.lowStockCount} SKUs)</span>
              </div>
              <div className="p-3 bg-rose-50/40 border border-rose-200/80 rounded-xl">
                <span className="text-[10px] text-rose-700 uppercase font-bold block">Out of Stock</span>
                <span className="text-xl font-extrabold text-rose-800">{health.outOfStockPercent}%</span>
                <span className="text-[10px] text-rose-600/80 block font-medium">({health.outOfStockCount} SKUs)</span>
              </div>
            </div>

            {/* Quick Status Summary Row */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-600">
              <span className="font-medium">Master SKU Tracking Status</span>
              <span className="font-bold text-zinc-900">
                {health.healthyCount} / {kpis.totalSkus || 1} Operational
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: STOCK BY WAREHOUSE */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-black" />
              Stock Distribution by Warehouse
            </h2>
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Live Location Sum</span>
          </div>

          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {stats?.stockByWarehouse?.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No warehouses initialized yet.</p>
            ) : (
              stats?.stockByWarehouse?.map((wh: any) => {
                const totalInv = parseFloat(wh.total_inventory);
                const percentOfTotal = kpis.totalStock > 0 ? Math.round((totalInv / kpis.totalStock) * 100) : 0;
                return (
                  <div key={wh.id} className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-zinc-950">{wh.name}</span>
                        <span className="text-[10px] text-zinc-500 ml-1.5 font-semibold">({wh.code})</span>
                      </div>
                      <span className="font-extrabold text-zinc-950">
                        {totalInv.toLocaleString()} <span className="text-[10px] text-zinc-500 font-normal">units</span>
                      </span>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-black h-full rounded-full transition-all duration-500" style={{ width: `${percentOfTotal}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Section 4: INVENTORY MOVEMENT CHART / BREAKDOWN (7/30 DAYS) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 pb-3 gap-2">
          <div>
            <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-black" />
              Inventory Ledger Movement Volume
            </h2>
            <p className="text-[11px] text-zinc-500">Aggregated quantities moved from immutable stock ledger</p>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start sm:self-auto">
            <button
              onClick={() => setMovementDays("7")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                movementDays === "7" ? "bg-black text-white shadow-xs shadow-black/20" : "text-zinc-700 hover:text-zinc-950 font-semibold"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setMovementDays("30")}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                movementDays === "30" ? "bg-black text-white shadow-xs shadow-black/20" : "text-zinc-700 hover:text-zinc-950 font-semibold"
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-600 font-semibold">
              <span>Receipts Received</span>
              <ArrowDownRight className="w-4 h-4 text-zinc-900" />
            </div>
            <p className="text-xl font-extrabold text-zinc-950">+{movementData.receipts}</p>
            <p className="text-[10px] text-zinc-600 font-medium">Incoming stock posted</p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-600 font-semibold">
              <span>Deliveries Shipped</span>
              <ArrowUpRight className="w-4 h-4 text-zinc-900" />
            </div>
            <p className="text-xl font-extrabold text-zinc-950">-{movementData.deliveries}</p>
            <p className="text-[10px] text-zinc-600 font-medium">Outgoing stock fulfilled</p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-600 font-semibold">
              <span>Transfers Relocated</span>
              <ArrowLeftRight className="w-4 h-4 text-zinc-900" />
            </div>
            <p className="text-xl font-extrabold text-zinc-950">±{movementData.transfers}</p>
            <p className="text-[10px] text-zinc-600 font-medium">Inter-warehouse volume</p>
          </div>

          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-600 font-semibold">
              <span>Adjustments Net</span>
              <SlidersHorizontal className="w-4 h-4 text-zinc-900" />
            </div>
            <p className="text-xl font-extrabold text-zinc-950">±{movementData.adjustments}</p>
            <p className="text-[10px] text-zinc-600 font-medium">Physical count variance</p>
          </div>
        </div>
      </div>

      {/* Grid: Low Stock Table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 5: LOW STOCK / STOCK STATUS TABLE */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-black" />
              Stock Threshold & Health Table
            </h2>
            <Link href="/products" className="text-xs text-zinc-700 hover:text-black font-semibold underline">
              View All Products
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold text-[11px]">
                <tr>
                  <th className="px-3 py-2.5">Product</th>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Warehouse / Location</th>
                  <th className="px-3 py-2.5">Stock</th>
                  <th className="px-3 py-2.5">Reorder Level</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {stats?.allProductsStock?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                      No product inventory records available.
                    </td>
                  </tr>
                ) : (
                  stats?.allProductsStock?.slice(0, 8).map((prod: any) => (
                    <tr key={prod.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-zinc-950">{prod.name}</td>
                      <td className="px-3 py-2.5 text-[11px] font-bold text-zinc-700">{prod.sku}</td>
                      <td className="px-3 py-2.5 text-[11px] text-zinc-700 font-medium">
                        {prod.warehouse_names || "Main Hub"} ({prod.location_names || "Default"})
                      </td>
                      <td className="px-3 py-2.5 font-extrabold text-zinc-950 whitespace-nowrap">
                        {prod.current_stock} {prod.unit_of_measure}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-zinc-700 whitespace-nowrap">
                        {prod.reorder_level} {prod.unit_of_measure}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={prod.status} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 6: RECENT ACTIVITY */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <h2 className="text-xs font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-black" />
              Recent Activity Feed
            </h2>
            <Link href="/operations/history" className="text-xs text-black hover:text-zinc-800 font-extrabold underline">
              Full Ledger
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.recentActivity?.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center font-medium">No recent activity recorded.</p>
            ) : (
              stats?.recentActivity?.map((act: any) => {
                const change = parseFloat(act.quantity_change);
                return (
                  <div key={act.id} className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-zinc-950">{act.product_name}</span>
                      <span className="text-xs font-black text-zinc-950">
                        {change > 0 ? `+${change}` : change}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-600 font-semibold">
                      <span>{act.user_name || "System User"}</span>
                      <span>{new Date(act.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Filterable Operations Feed Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm space-y-3">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-950">Operational Documents Feed</h2>
            <p className="text-[11px] text-zinc-600">
              Filtered operations queue. Click "Validate" to trigger validation preview & post stock ledger entries.
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="text-zinc-500 hover:text-zinc-900 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors self-start sm:self-auto"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="px-4 pb-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Doc Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-2.5 py-1.5 focus:outline-none focus:border-black"
            >
              <option value="All">All Document Types</option>
              <option value="Receipts">Receipts</option>
              <option value="Delivery">Deliveries</option>
              <option value="Internal">Transfers</option>
              <option value="Adjustments">Adjustments</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-2.5 py-1.5 focus:outline-none focus:border-black"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Waiting">Waiting</option>
              <option value="Ready">Ready</option>
              <option value="Done">Done</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-2.5 py-1.5 focus:outline-none focus:border-black"
            >
              <option value="All">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.warehouse_name} → {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-2.5 py-1.5 focus:outline-none focus:border-black"
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
                <th className="px-4 py-3 text-right">Validate Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Loading operations queue...
                  </td>
                </tr>
              ) : stats?.documents?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No operational documents matching criteria.
                  </td>
                </tr>
              ) : (
                stats?.documents?.map((doc: any) => (
                  <tr key={`${doc.type}-${doc.id}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-zinc-950">{doc.reference}</td>
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
                    <td className="px-4 py-3 text-zinc-600">{doc.partner_or_reason || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {doc.status !== "Done" && doc.status !== "Canceled" ? (
                        <button
                          onClick={() => handleOpenValidationModal(doc)}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-xs shadow-black/20 transition-all"
                        >
                          Validate & Post
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono">Posted</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Confirmation Preview Modal */}
      {previewDoc && (
        <ValidationPreviewModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false);
            setPreviewDoc(null);
          }}
          onConfirm={handleExecuteValidation}
          doc={previewDoc}
        />
      )}
    </div>
  );
}
