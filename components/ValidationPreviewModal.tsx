"use client";

import React, { useState, useEffect } from "react";
import StatusTimeline from "./StatusTimeline";
import { AlertCircle, CheckCircle2, X, ArrowRight, Layers } from "lucide-react";

interface ValidationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  doc: {
    id: number;
    reference: string;
    type: string; // 'Receipt' | 'Delivery' | 'Internal' | 'Adjustment'
    status: string;
    items?: Array<{
      product_id: number;
      product_name: string;
      sku?: string;
      quantity: number | string;
      unit_of_measure?: string;
      previous_quantity?: number | string;
      counted_quantity?: number | string;
    }>;
    source_location_id?: number;
    source_location_name?: string;
    destination_location_id?: number;
    destination_location_name?: string;
    location_name?: string;
  };
}

export default function ValidationPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  doc,
}: ValidationPreviewModalProps) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previews, setPreviews] = useState<any[]>([]);
  const [hasInsufficientStock, setHasInsufficientStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && doc) {
      calculatePreview();
    }
  }, [isOpen, doc]);

  const calculatePreview = async () => {
    setLoadingPreview(true);
    setHasInsufficientStock(false);
    setErrorMessage(null);

    try {
      // Fetch full doc details if items not attached
      let fullItems = doc.items || [];
      let sourceLocId = doc.source_location_id;
      let destLocId = doc.destination_location_id;

      if (!fullItems.length) {
        let endpoint = "";
        if (doc.type === "Receipt") endpoint = `/api/operations/receipts`;
        else if (doc.type === "Delivery") endpoint = `/api/operations/deliveries`;
        else if (doc.type === "Internal") endpoint = `/api/operations/transfers`;
        else if (doc.type === "Adjustment") endpoint = `/api/operations/adjustments`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const found = (data.receipts || data.deliveries || data.transfers || data.adjustments || []).find(
            (d: any) => d.id === doc.id
          );
          if (found) {
            fullItems = found.items || [];
            sourceLocId = found.source_location_id || sourceLocId;
            destLocId = found.destination_location_id || destLocId;
          }
        }
      }

      // Fetch products live inventory stock
      const prodRes = await fetch("/api/products");
      const prodData = await prodRes.json();
      const allProducts = prodData.products || [];

      const calculatedPreviews: any[] = [];
      let insufficient = false;

      for (const item of fullItems) {
        const qty = parseFloat(String(item.quantity || "0"));
        const prodId = item.product_id;
        const targetProd = allProducts.find((p: any) => p.id === prodId);
        const uom = item.unit_of_measure || targetProd?.unit_of_measure || "PCS";
        const prodName = item.product_name || targetProd?.name || `Product #${prodId}`;
        const sku = item.sku || targetProd?.sku || "—";

        // Find current stock in source/destination locations
        const locations = targetProd?.locations || [];

        if (doc.type === "Delivery") {
          const srcLoc = locations.find((l: any) => l.location_id === sourceLocId);
          const currentAvailable = parseFloat(srcLoc?.quantity || "0");
          const remaining = currentAvailable - qty;

          if (remaining < 0) insufficient = true;

          calculatedPreviews.push({
            product_name: prodName,
            sku,
            unit: uom,
            location_name: doc.source_location_name || srcLoc?.location_name || "Source Location",
            available: currentAvailable,
            requested: qty,
            remaining,
            before: currentAvailable,
            change: -qty,
            after: remaining,
            isDelivery: true,
            isShortage: remaining < 0,
          });
        } else if (doc.type === "Internal") {
          // Transfer has two locations: Source (Out) & Destination (In)
          const srcLoc = locations.find((l: any) => l.location_id === sourceLocId);
          const destLoc = locations.find((l: any) => l.location_id === destLocId);

          const srcAvailable = parseFloat(srcLoc?.quantity || "0");
          const destAvailable = parseFloat(destLoc?.quantity || "0");
          const srcAfter = srcAvailable - qty;
          const destAfter = destAvailable + qty;

          if (srcAfter < 0) insufficient = true;

          calculatedPreviews.push({
            product_name: prodName,
            sku,
            unit: uom,
            transferSource: {
              location_name: doc.source_location_name || srcLoc?.location_name || "Source Location",
              before: srcAvailable,
              change: -qty,
              after: srcAfter,
              isShortage: srcAfter < 0,
            },
            transferDest: {
              location_name: doc.destination_location_name || destLoc?.location_name || "Destination Location",
              before: destAvailable,
              change: +qty,
              after: destAfter,
            },
            isTransfer: true,
          });
        } else if (doc.type === "Receipt") {
          const destLoc = locations.find((l: any) => l.location_id === destLocId);
          const currentStock = parseFloat(destLoc?.quantity || "0");
          const after = currentStock + qty;

          calculatedPreviews.push({
            product_name: prodName,
            sku,
            unit: uom,
            location_name: doc.destination_location_name || destLoc?.location_name || "Destination Location",
            before: currentStock,
            change: +qty,
            after,
            isReceipt: true,
          });
        } else if (doc.type === "Adjustment") {
          const prev = parseFloat(String(item.previous_quantity || "0"));
          const counted = parseFloat(String(item.counted_quantity || "0"));
          const diff = counted - prev;

          calculatedPreviews.push({
            product_name: prodName,
            sku,
            unit: uom,
            location_name: doc.location_name || "Count Location",
            before: prev,
            change: diff,
            after: counted,
            isAdjustment: true,
          });
        }
      }

      setPreviews(calculatedPreviews);
      setHasInsufficientStock(insufficient);
    } catch (err: any) {
      console.error("Failed to calculate validation preview:", err);
      setErrorMessage("Could not load preview stock math.");
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (hasInsufficientStock) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Validation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Operation Validation Preview
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium">
              Ref: <span className="font-bold text-zinc-900">{doc.reference}</span> ({doc.type})
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-950 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Lifecycle Indicator */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
          <StatusTimeline status={doc.status || "Ready"} />
        </div>

        {/* Error / Insufficient Stock Alert */}
        {hasInsufficientStock && (
          <div className="p-3.5 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center gap-2 border border-rose-700 shadow-md">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <div>
              <p className="font-bold">Insufficient Stock Warning</p>
              <p className="text-[11px] text-rose-100 font-normal">
                One or more items exceed available location stock. Confirmation is disabled.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Stock Impact BEFORE vs AFTER Cards */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
            Stock Mutation Impact (BEFORE ➔ AFTER)
          </h4>

          {loadingPreview ? (
            <p className="text-xs text-zinc-500 py-4 text-center">Calculating real-time stock balances...</p>
          ) : previews.length === 0 ? (
            <p className="text-xs text-zinc-500 py-2">No items found for preview.</p>
          ) : (
            previews.map((item, idx) => (
              <div key={idx} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs space-y-2">
                <div className="flex justify-between items-center border-b border-zinc-200 pb-1.5">
                  <span className="font-bold text-zinc-950">{item.product_name}</span>
                  <span className="font-mono text-[10px] text-zinc-500">SKU: {item.sku}</span>
                </div>

                {/* Delivery Stock Preview */}
                {item.isDelivery && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-3 gap-2 text-center bg-white p-2 rounded-lg border border-zinc-200">
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Available</span>
                        <span className="font-mono font-extrabold text-zinc-900">
                          {item.available} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Requested</span>
                        <span className="font-mono font-extrabold text-zinc-900">
                          {item.requested} {item.unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold">Remaining</span>
                        <span
                          className={`font-mono font-extrabold ${
                            item.isShortage ? "text-red-600 underline" : "text-zinc-950"
                          }`}
                        >
                          {item.remaining} {item.unit}
                        </span>
                      </div>
                    </div>
                    {item.isShortage && (
                      <span className="text-[10px] text-red-600 font-bold block text-center">
                        ⚠️ Shortage of {Math.abs(item.remaining)} {item.unit} in location!
                      </span>
                    )}
                  </div>
                )}

                {/* Transfer BEFORE vs AFTER (2 Locations) */}
                {item.isTransfer && (
                  <div className="space-y-2">
                    {/* Source Location */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-zinc-200">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-bold">Source Location</span>
                        <span className="font-bold text-zinc-900">{item.transferSource.location_name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-zinc-500">{item.transferSource.before}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className={`font-extrabold ${item.transferSource.isShortage ? "text-red-600" : "text-zinc-950"}`}>
                          {item.transferSource.after} {item.unit}
                        </span>
                      </div>
                    </div>

                    {/* Destination Location */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-zinc-200">
                      <div>
                        <span className="text-[10px] text-zinc-500 block font-bold">Destination Location</span>
                        <span className="font-bold text-zinc-900">{item.transferDest.location_name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-zinc-500">{item.transferDest.before}</span>
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        <span className="font-extrabold text-zinc-950">
                          {item.transferDest.after} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Receipt or Adjustment BEFORE vs AFTER */}
                {(item.isReceipt || item.isAdjustment) && (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-zinc-200">
                    <div>
                      <span className="text-[10px] text-zinc-500 block font-bold">Location</span>
                      <span className="font-bold text-zinc-900">{item.location_name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">Before</span>
                        <span className="text-zinc-600 font-bold">{item.before}</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-400 mt-2" />
                      <div>
                        <span className="text-[9px] text-zinc-400 uppercase block">After</span>
                        <span className="font-extrabold text-zinc-950 text-sm">
                          {item.after} {item.unit}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl border border-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={submitting || hasInsufficientStock || loadingPreview}
            className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-black/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? (
              "Validating..."
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                Confirm & Validate Operation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
