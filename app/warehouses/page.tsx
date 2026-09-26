"use client";

import React, { useState, useEffect } from "react";
import {
  Warehouse,
  Plus,
  MapPin,
  Building2,
  X,
} from "lucide-react";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showWhModal, setShowWhModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [selectedWhId, setSelectedWhId] = useState<number | null>(null);

  // Warehouse Form
  const [whName, setWhName] = useState("");
  const [whCode, setWhCode] = useState("");
  const [whAddress, setWhAddress] = useState("");

  // Location Form
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locType, setLocType] = useState("STORAGE");

  const [submitting, setSubmitting] = useState(false);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouses");
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: whName, code: whCode, address: whAddress }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowWhModal(false);
        setWhName("");
        setWhCode("");
        setWhAddress("");
        fetchWarehouses();
      } else {
        alert("Error: " + (data.error || "Failed to create warehouse"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWhId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_id: selectedWhId,
          name: locName,
          code: locCode,
          location_type: locType,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowLocModal(false);
        setLocName("");
        setLocCode("");
        fetchWarehouses();
      } else {
        alert("Error: " + (data.error || "Failed to create location"));
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-blue-600 tracking-tight flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-blue-600" />
            Warehouse & Location Management
          </h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Define multi-warehouse structures, storage racks, production floors, and dispatch zones.
          </p>
        </div>

        <button
          onClick={() => setShowWhModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Warehouse
        </button>
      </div>

      {/* Warehouses Grid */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-xs font-bold">Loading warehouses & locations...</div>
      ) : warehouses.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-xs bg-white border border-zinc-200 rounded-2xl shadow-sm font-bold">
          No warehouses found. Click &quot;Add Warehouse&quot; to build your facility hierarchy.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-sm hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-950">{wh.name}</h3>
                    <p className="text-xs text-zinc-600 font-mono font-bold">Code: {wh.code}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedWhId(wh.id);
                    setShowLocModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-1 shadow-xs shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Location
                </button>
              </div>

              {wh.address && (
                <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {wh.address}
                </p>
              )}

              {/* Locations List */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                  Internal Locations ({wh.locations?.length || 0})
                </p>

                {wh.locations?.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">No rack or floor locations created yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {wh.locations.map((loc: any) => (
                      <div
                        key={loc.id}
                        className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-zinc-950">{loc.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">Code: {loc.code}</p>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-200 text-zinc-900 border border-zinc-300 font-bold">
                          {loc.location_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-950">Add New Warehouse</h3>
              <button onClick={() => setShowWhModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="Main Warehouse"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Warehouse Code *</label>
                <input
                  type="text"
                  required
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  placeholder="MW-01"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 font-mono uppercase focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  placeholder="100 Logistics Pkwy, Sector 4"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowWhModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl border border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? "Saving..." : "Create Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-950">Add Location to Warehouse</h3>
              <button onClick={() => setShowLocModal(false)} className="text-zinc-500 hover:text-zinc-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="Main Store / Production Rack / Rack A"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Location Code *</label>
                <input
                  type="text"
                  required
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value)}
                  placeholder="MS-01 / PR-01 / RACK-A"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 font-mono uppercase focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Location Type</label>
                <select
                  value={locType}
                  onChange={(e) => setLocType(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                >
                  <option value="STORAGE">STORAGE (Warehouse Rack/Aisle)</option>
                  <option value="PRODUCTION">PRODUCTION (Production Floor)</option>
                  <option value="DISPATCH">DISPATCH (Shipping Area)</option>
                  <option value="RECEIVING">RECEIVING (Vendor Dock)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowLocModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl border border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs shadow-blue-500/20 disabled:opacity-50 transition-all"
                >
                  {submitting ? "Saving..." : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
