"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import ValidationPreviewModal from "@/components/ValidationPreviewModal";
import {
  ArrowDownRight,
  Plus,
  CheckCircle2,
  X,
} from "lucide-react";

function ReceiptsContent() {
  const searchParams = useSearchParams();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(searchParams.get("new") === "true");
  const [supplierId, setSupplierId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
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
      const [recRes, supRes, locRes, prodRes] = await Promise.all([
        fetch("/api/operations/receipts"),
        fetch("/api/suppliers"),
        fetch("/api/locations"),
        fetch("/api/products"),
      ]);

      if (recRes.ok) setReceipts((await recRes.json()).receipts || []);
      if (supRes.ok) setSuppliers((await supRes.json()).suppliers || []);
      if (locRes.ok) setLocations((await locRes.json()).locations || []);
      if (prodRes.ok) setProducts((await prodRes.json()).products || []);
    } catch (err) {
      console.error("Error loading receipts data:", err);
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

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/operations/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          destination_location_id: destinationLocationId,
          status,
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowModal(false);
        setSupplierId("");
        setItems([{ product_id: "", quantity: "1" }]);
        fetchData();
      } else {
        alert("Error: " + (data.error || "Failed to create receipt"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPreviewModal = (r: any) => {
    setPreviewDoc({
      id: r.id,
      reference: r.receipt_number,
      type: "Receipt",
      status: r.status,
      items: r.items,
      destination_location_id: r.destination_location_id,
      destination_location_name: r.destination_location_name,
    });
    setShowPreviewModal(true);
  };

  const handleExecuteValidation = async () => {
    if (!previewDoc) return;
    const res = await fetch(`/api/operations/receipts/${previewDoc.id}/validate`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      fetchData();
    } else {
      throw new Error(data.error || "Failed to validate receipt");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2">
            <ArrowDownRight className="w-6 h-6 text-zinc-950" />
            Receipts (Incoming Stock)
          </h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Receive goods from suppliers. Stock increases atomically upon document validation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/operations/receipts/export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-300 shadow-xs transition-all"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> Create Receipt
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/90 text-zinc-900 border-b border-zinc-200 font-extrabold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Receipt No.</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Destination Location</th>
                <th className="px-4 py-3">Received Items</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created Date</th>
                <th className="px-4 py-3 text-right">Validate Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-bold">
                    Loading receipts...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 font-bold">
                    No receipts recorded. Click "Create Receipt" to log incoming goods.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-950">{r.receipt_number}</td>
                    <td className="px-4 py-3 text-zinc-900 font-semibold">{r.supplier_name || "Direct Vendor"}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-zinc-950">{r.destination_location_name}</span>
                      <span className="text-[10px] text-zinc-600 font-medium block">{r.warehouse_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {r.items?.map((item: any) => (
                          <div key={item.id} className="text-[11px]">
                            <span className="font-bold text-zinc-950">{item.product_name}</span>:{" "}
                            <span className="text-zinc-950 font-black">+{item.quantity} {item.unit_of_measure}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-700 text-[11px] font-bold">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== "Done" && r.status !== "Canceled" ? (
                        <button
                          onClick={() => handleOpenPreviewModal(r)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-black hover:bg-zinc-800 text-white shadow-xs transition-all"
                        >
                          Validate Stock
                        </button>
                      ) : (
                        <span className="text-[11px] text-zinc-600 flex items-center justify-end gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Stock Increased
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

      {/* Create Receipt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-black" />
                Create Incoming Stock Receipt
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Supplier / Vendor</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Destination Location *</label>
                  <select
                    required
                    value={destinationLocationId}
                    onChange={(e) => setDestinationLocationId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select Receiving Location</option>
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
                  <option value="Draft">Draft (Plan - does not affect stock)</option>
                  <option value="Ready">Ready (Prepared for validation)</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-zinc-900">Products & Quantities *</label>
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
                  className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all"
                >
                  {submitting ? "Creating..." : "Save Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-zinc-500 text-xs">Loading receipts...</div>}>
      <ReceiptsContent />
    </Suspense>
  );
}
