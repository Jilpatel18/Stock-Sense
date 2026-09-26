"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ValidationPreviewModal from "@/components/ValidationPreviewModal";
import {
  ArrowUpRight,
  Plus,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";

function DeliveriesContent() {
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(searchParams.get("new") === "true");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [status, setStatus] = useState("Draft");
  const [items, setItems] = useState<any[]>([{ product_id: "", quantity: "1" }]);
  const [submitting, setSubmitting] = useState(false);
  
  // Validation Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [delRes, locRes, prodRes] = await Promise.all([
        fetch("/api/operations/deliveries"),
        fetch("/api/locations"),
        fetch("/api/products"),
      ]);

      if (delRes.ok) setDeliveries((await delRes.json()).deliveries || []);
      if (locRes.ok) setLocations((await locRes.json()).locations || []);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
    } catch (err) {
      console.error("Error loading deliveries data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { product_id: "", quantity: "1" }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx][field] = value;
    setItems(next);
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/operations/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_location_id: sourceLocationId,
          customer_name: customerName,
          status,
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setCustomerName("");
        setItems([{ product_id: "", quantity: "1" }]);
        fetchData();
      } else {
        alert("Error: " + (data.error || "Failed to create delivery order"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPreviewModal = (d: any) => {
    setPreviewDoc({
      id: d.id,
      reference: d.delivery_number,
      type: "Delivery",
      status: d.status,
      items: d.items,
      source_location_id: d.source_location_id,
      source_location_name: d.source_location_name,
    });
    setShowPreviewModal(true);
  };

  const handleExecuteValidation = async () => {
    if (!previewDoc) return;
    const res = await fetch(`/api/operations/deliveries/${previewDoc.id}/validate`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      fetchData();
    } else {
      throw new Error(data.error || "Failed to validate delivery order");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            <ArrowUpRight className="w-6 h-6 text-black" />
            Delivery Orders (Outgoing Stock)
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Ship goods to customers. Validates stock availability and decreases quantity atomically.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/operations/deliveries/export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-300 shadow-xs transition-all"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-black text-white hover:bg-zinc-800 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Create Delivery Order
          </button>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Delivery Order No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Source Location</th>
                <th className="px-4 py-3">Items to Ship</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-right">Validate Shipment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    Loading delivery orders...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No delivery orders recorded. Click "Create Delivery Order" to begin.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-zinc-950">{d.delivery_number}</td>
                    <td className="px-4 py-3 text-zinc-700">{d.customer_name || "Direct Customer"}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-zinc-950">{d.source_location_name}</span>
                      <span className="text-[10px] text-zinc-500 block">{d.warehouse_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {d.items?.map((item: any) => (
                          <div key={item.id} className="text-[11px]">
                            <span className="font-semibold text-zinc-950">{item.product_name}</span>:{" "}
                            <span className="font-mono text-zinc-950 font-bold">-{item.quantity} {item.unit_of_measure}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.status !== "Done" && d.status !== "Canceled" ? (
                        <button
                          onClick={() => handleOpenPreviewModal(d)}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-black text-white hover:bg-zinc-800 shadow-sm transition-all"
                        >
                          Validate Shipment
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono flex items-center justify-end gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Stock Shipped
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Preview Modal */}
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

      {/* Create Delivery Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-black" />
                Create Delivery Order
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Customer / Client</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Apex Manufacturing"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Source Location *</label>
                  <select
                    required
                    value={sourceLocationId}
                    onChange={(e) => setSourceLocationId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select Dispatch Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse_name} → {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Initial Document Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="Draft">Draft (Plan - does not reserve stock)</option>
                  <option value="Ready">Ready (Prepared for shipment validation)</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-zinc-900">Products & Quantities to Ship *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[11px] text-zinc-700 hover:text-black font-semibold underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Product
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      required
                      value={item.product_id}
                      onChange={(e) => handleItemChange(idx, "product_id", e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Total Stock: {p.total_stock}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      required
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="w-24 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    />

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="text-zinc-400 hover:text-zinc-900 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl border border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-black text-white font-extrabold hover:bg-zinc-800 text-xs rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Save Delivery Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveriesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Loading delivery orders...</div>}>
      <DeliveriesContent />
    </Suspense>
  );
}
