"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ValidationPreviewModal from "@/components/ValidationPreviewModal";
import { toast } from "@/context/ToastContext";
import {
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  X,
} from "lucide-react";

function AdjustmentsContent() {
  const searchParams = useSearchParams();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(searchParams.get("new") === "true");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("Draft");
  const [items, setItems] = useState<any[]>([{ product_id: "", counted_quantity: "0" }]);
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
      const [adjRes, locRes, prodRes] = await Promise.all([
        fetch("/api/operations/adjustments"),
        fetch("/api/locations"),
        fetch("/api/products"),
      ]);

      if (adjRes.ok) setAdjustments((await adjRes.json()).adjustments || []);
      if (locRes.ok) setLocations((await locRes.json()).locations || []);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
    } catch (err) {
      console.error("Error loading adjustments data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItemRow = () => {
    setItems([...items, { product_id: "", counted_quantity: "0" }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    const next = [...items];
    next[idx][field] = value;
    setItems(next);
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/operations/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          reason,
          status,
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Adjustment #${data.adjustment?.adjustment_number || "Draft"} created successfully!`);
        setShowModal(false);
        setReason("");
        setLocationId("");
        setItems([{ product_id: "", counted_quantity: "0" }]);
        fetchData();
      } else {
        const errorMsg = data.error || "Failed to create inventory adjustment";
        toast.error("Error: " + errorMsg);
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPreviewModal = (a: any) => {
    setPreviewDoc({
      id: a.id,
      reference: a.adjustment_number,
      type: "Adjustment",
      status: a.status,
      items: a.items,
      location_name: a.location_name,
    });
    setShowPreviewModal(true);
  };

  const handleExecuteValidation = async () => {
    if (!previewDoc) return;
    const res = await fetch(`/api/operations/adjustments/${previewDoc.id}/validate`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      toast.success(`Stock Adjustment ${previewDoc.reference} validated & posted!`);
      fetchData();
    } else {
      const errorMsg = data.error || "Failed to validate adjustment";
      toast.error("Validation Error: " + errorMsg);
      throw new Error(errorMsg);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-zinc-950" />
            Inventory Adjustments (Stock Reconciliation)
          </h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Reconcile recorded system inventory against physical stock counts or damaged goods.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/operations/adjustments/export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-300 shadow-xs transition-all"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> Create Stock Adjustment
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/90 text-zinc-900 border-b border-zinc-200 font-extrabold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Adjustment No.</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Audit Reason</th>
                <th className="px-4 py-3">Physical Count vs System</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-right">Validate Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-bold">
                    Loading inventory adjustments...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-bold">
                    No stock adjustments recorded. Click "Create Stock Adjustment" to perform audit count.
                  </td>
                </tr>
              ) : (
                adjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-zinc-950">{a.adjustment_number}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-zinc-950">{a.location_name}</span>
                      <span className="text-[10px] text-zinc-600 font-medium block">{a.warehouse_name}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-900 font-semibold">{a.reason || "Physical Stock Count"}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {a.items?.map((item: any) => {
                          const diff = parseFloat(item.difference);
                          return (
                            <div key={item.id} className="text-[11px]">
                              <span className="font-bold text-zinc-950">{item.product_name}</span>:{" "}
                              <span>Counted: <strong className="text-zinc-950">{item.counted_quantity}</strong></span>{" "}
                              {a.status === "Done" && (
                                <span className="font-mono text-[10px] text-zinc-700 font-extrabold">
                                  (Diff: {diff > 0 ? `+${diff}` : diff})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-700 font-mono text-[11px] font-bold">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status !== "Done" && a.status !== "Canceled" ? (
                        <button
                          onClick={() => handleOpenPreviewModal(a)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
                        >
                          Validate Adjustment
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-mono flex items-center justify-end gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-black" /> Reconciled
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

      {/* Create Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-black" />
                Create Stock Adjustment
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Location *</label>
                  <select
                    required
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select Location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.warehouse_name} → {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Reason / Notes</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Physical audit / Damaged goods (-3 kg)"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Initial Document Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="Draft">Draft (Audit Count In Progress)</option>
                  <option value="Ready">Ready (Prepared for validation)</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-zinc-900">Physical Counted Quantities *</label>
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
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>

                    <div className="w-32">
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={item.counted_quantity}
                        onChange={(e) => handleItemChange(idx, "counted_quantity", e.target.value)}
                        placeholder="Physical Count"
                        className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      />
                    </div>

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
                  className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all"
                >
                  {submitting ? "Creating..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdjustmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Loading inventory adjustments...</div>}>
      <AdjustmentsContent />
    </Suspense>
  );
}
