"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  History,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
} from "lucide-react";

import StatusBadge from "@/components/StatusBadge";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductDetails();
  }, [resolvedParams.id]);

  const fetchProductDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
      }
    } catch (err) {
      console.error("Error fetching product details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-zinc-500 font-medium text-xs">
        Loading product detail & audit ledger...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-zinc-400 space-y-4">
        <p className="text-xs font-semibold">Product not found.</p>
        <Link href="/products" className="text-black underline text-xs font-bold">
          ← Back to products
        </Link>
      </div>
    );
  }

  const isOutOfStock = parseFloat(product.total_stock) === 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-950 transition-colors mb-3 font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">{product.name}</h1>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-300 font-extrabold">
                SKU: {product.sku}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1 font-medium">
              Category: {product.category_name || "Uncategorized"} • Unit: {product.unit_of_measure}
            </p>
          </div>

          <div
            className={`flex items-center gap-3 border rounded-2xl p-4 shadow-2xs ${
              isOutOfStock
                ? "bg-rose-50/40 border-rose-200"
                : product.is_low_stock
                ? "bg-amber-50/30 border-amber-200"
                : "bg-white border-zinc-200"
            }`}
          >
            <div>
              <span className="text-[11px] text-zinc-600 block font-semibold">Total Company Stock</span>
              <span
                className={`text-2xl font-black font-mono ${
                  isOutOfStock
                    ? "text-rose-700"
                    : product.is_low_stock
                    ? "text-amber-800"
                    : "text-zinc-950"
                }`}
              >
                {product.total_stock}{" "}
                <span className="text-xs text-zinc-500 font-normal font-sans">{product.unit_of_measure}</span>
              </span>
            </div>
            <div>
              {isOutOfStock ? (
                <StatusBadge status="Out of Stock" size="sm" />
              ) : product.is_low_stock ? (
                <StatusBadge status="Low Stock" size="sm" />
              ) : (
                <StatusBadge status="Healthy" size="sm" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Stock Locations + Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Locations breakdown */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-black" />
            Location-Aware Stock Breakdown
          </h2>

          {product.locations?.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">No stock recorded in any location.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.locations?.map((loc: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-zinc-950">{loc.location_name}</p>
                    <p className="text-[10px] text-zinc-500">{loc.warehouse_name} ({loc.location_code})</p>
                  </div>
                  <span className="font-extrabold text-zinc-950 text-sm">
                    {loc.quantity} {product.unit_of_measure}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Specs */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
          <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Product Controls</h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-zinc-200 pb-2">
              <span className="text-zinc-600">Reorder Level:</span>
              <span className="font-bold text-zinc-950">{product.reorder_level} {product.unit_of_measure}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-200 pb-2">
              <span className="text-zinc-600">Status:</span>
              <span className={product.is_low_stock ? "text-amber-700 font-bold" : "text-zinc-600 font-medium"}>
                {product.is_low_stock ? "Low Stock Alert" : "Healthy Stock"}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-600">Created:</span>
              <span className="text-zinc-600 text-[11px] font-medium">
                {new Date(product.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Product Movement Timeline */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2 uppercase tracking-wider">
            <History className="w-4 h-4 text-black" />
            Product Movement Timeline
          </h2>
          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">Current Stock</span>
            <span className="text-base font-black text-zinc-950">
              {product.total_stock} {product.unit_of_measure}
            </span>
          </div>
        </div>

        {product.history?.length === 0 ? (
          <p className="text-xs text-zinc-500 py-4 text-center">No movement history recorded yet.</p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
            {product.history?.map((entry: any) => {
              const change = parseFloat(entry.quantity_change);
              const isPositive = change > 0;
              const formattedTime = new Date(entry.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              const formattedDate = new Date(entry.created_at).toLocaleDateString();

              return (
                <div key={entry.id} className="relative flex items-start justify-between gap-4 text-xs">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-black ring-4 ring-zinc-200" />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500 font-semibold">
                        {formattedTime} <span className="text-[10px] text-zinc-400">({formattedDate})</span>
                      </span>
                      <span className="font-bold text-zinc-950 px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 uppercase tracking-tight text-[11px]">
                        {entry.operation_type}
                      </span>
                      <span className="text-[11px] text-zinc-600 font-semibold">
                        #{entry.reference_number}
                      </span>
                    </div>

                    <p className="text-zinc-600 text-[11px]">
                      Location: <span className="font-medium text-zinc-900">{entry.location_name}</span> • By:{" "}
                      <span className="font-medium text-zinc-900">{entry.performed_by_name || "System"}</span>
                    </p>
                  </div>

                  <div className="text-right whitespace-nowrap">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                        isPositive
                          ? "bg-black text-white border-black shadow-xs"
                          : "bg-zinc-100 text-zinc-900 border-zinc-300"
                      }`}
                    >
                      {isPositive ? `+${change}` : change} {product.unit_of_measure}
                    </span>
                    <span className="block text-[10px] text-zinc-400 font-medium mt-1">
                      After: {entry.quantity_after} {product.unit_of_measure}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Immutable Stock Ledger Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-950 flex items-center gap-2 uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-zinc-950" />
            Detailed Stock Ledger Table
          </h2>
          <span className="text-[10px] text-zinc-500 font-mono">Immutable Transaction Audit</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">Reference No.</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Qty Before</th>
                <th className="px-4 py-3">Qty Change</th>
                <th className="px-4 py-3">Qty After</th>
                <th className="px-4 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {product.history?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No historical stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                product.history?.map((entry: any) => {
                  const change = parseFloat(entry.quantity_change);
                  return (
                    <tr key={entry.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-900">
                          {entry.operation_type === "RECEIPT" && <ArrowDownRight className="w-3.5 h-3.5 text-zinc-500" />}
                          {entry.operation_type === "DELIVERY" && <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />}
                          {entry.operation_type.startsWith("TRANSFER") && <ArrowLeftRight className="w-3.5 h-3.5 text-zinc-500" />}
                          {entry.operation_type === "ADJUSTMENT" && <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />}
                          {entry.operation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-zinc-950">{entry.reference_number}</td>
                      <td className="px-4 py-3 text-zinc-700">{entry.location_name}</td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{entry.quantity_before}</td>
                      <td className="px-4 py-3 font-mono font-extrabold text-zinc-950">
                        {change > 0 ? `+${change}` : change}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-950 font-black text-sm">{entry.quantity_after}</td>
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
