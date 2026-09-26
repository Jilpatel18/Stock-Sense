"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";

export default function StockLedgerHistoryPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [operationType, setOperationType] = useState("All");

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [selectedProduct, selectedLocation, operationType]);

  const fetchMetadata = async () => {
    try {
      const [prodRes, locRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/locations"),
      ]);

      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
      if (locRes.ok) setLocations((await locRes.json()).locations || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedProduct !== "All") params.append("product_id", selectedProduct);
      if (selectedLocation !== "All") params.append("location_id", selectedLocation);
      if (operationType !== "All") params.append("operation_type", operationType);

      const res = await fetch(`/api/operations/ledger?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLedger(data.ledger || []);
      }
    } catch (err) {
      console.error("Error fetching stock ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-black" />
            Stock Ledger & Audit Log
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Complete, immutable chronological record of every inventory movement and adjustment
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/operations/ledger/export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-300 shadow-xs transition-all"
          >
            Export CSV
          </a>
          <button
            onClick={fetchLedger}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Audit
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-sm">
        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Filter by Product</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          >
            <option value="All">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Filter by Location</label>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
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
          <label className="block text-[11px] font-semibold text-zinc-600 mb-1">Operation Type</label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          >
            <option value="All">All Operations</option>
            <option value="RECEIPT">RECEIPT (Incoming Goods)</option>
            <option value="DELIVERY">DELIVERY (Customer Shipment)</option>
            <option value="TRANSFER_OUT">TRANSFER_OUT (Location Source)</option>
            <option value="TRANSFER_IN">TRANSFER_IN (Location Target)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (Audit Reconciliation)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Product Name & SKU</th>
                <th className="px-4 py-3">Location & Warehouse</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">Reference No.</th>
                <th className="px-4 py-3 text-right">Qty Before</th>
                <th className="px-4 py-3 text-right">Qty Change</th>
                <th className="px-4 py-3 text-right">Qty After</th>
                <th className="px-4 py-3">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                    Querying immutable ledger entries...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                    No ledger entries found. Validate an operational document to create stock movements.
                  </td>
                </tr>
              ) : (
                ledger.map((entry) => {
                  const change = parseFloat(entry.quantity_change);
                  return (
                    <tr key={entry.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-zinc-950 block">{entry.product_name}</span>
                        <span className="font-mono text-[10px] text-zinc-500">SKU: {entry.sku}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-zinc-950">{entry.location_name}</span>
                        <span className="text-[10px] text-zinc-500 block">{entry.warehouse_name}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-900">
                          {entry.operation_type === "RECEIPT" && <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />}
                          {entry.operation_type === "DELIVERY" && <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" />}
                          {entry.operation_type.startsWith("TRANSFER") && <ArrowLeftRight className="w-3.5 h-3.5 text-sky-600" />}
                          {entry.operation_type === "ADJUSTMENT" && <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />}
                          {entry.operation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-950">
                        {entry.reference_number}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500 text-right">{entry.quantity_before}</td>
                      <td className={`px-4 py-3 font-mono font-extrabold text-sm text-right ${change > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {change > 0 ? `+${change}` : change} {entry.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-zinc-950 text-sm text-right">
                        {entry.quantity_after} {entry.unit_of_measure}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{entry.performed_by_name || "System"}</td>
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
