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
      <div className="max-w-5xl mx-auto p-8 text-center text-zinc-500">
        Loading product detail & audit ledger...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center text-zinc-400 space-y-4">
        <p>Product not found.</p>
        <Link href="/products" className="text-white underline text-xs">
          ← Back to products
        </Link>
      </div>
    );
  }

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
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-900 border border-zinc-300 font-bold">
                SKU: {product.sku}
              </span>
            </div>
            <p className="text-xs text-zinc-600 mt-1">
              Category: {product.category_name || "Uncategorized"} • Unit: {product.unit_of_measure}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
            <div>
              <span className="text-[11px] text-zinc-600 block font-semibold">Total Company Stock</span>
              <span className="text-2xl font-extrabold text-zinc-950">
                {product.total_stock} <span className="text-xs text-zinc-500 font-normal">{product.unit_of_measure}</span>
              </span>
            </div>
            {product.is_low_stock && (
              <div className="p-2 rounded-xl bg-black text-white font-bold" title="Stock at or below reorder level">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
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
                  <span className="font-extrabold text-zinc-950 font-mono text-sm">
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
              <span className={product.is_low_stock ? "text-black font-bold" : "text-zinc-600 font-medium"}>
                {product.is_low_stock ? "Low Stock Alert" : "Healthy Stock"}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-600">Created:</span>
              <span className="text-zinc-600 font-mono text-[11px]">
                {new Date(product.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Immutable Stock Ledger History for Product */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-950" />
            Stock Movement History (Ledger)
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
