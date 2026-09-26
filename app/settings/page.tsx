"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Warehouse,
  MapPin,
  Tag,
  Truck,
  Sliders,
  Info,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  RotateCcw,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "warehouses" | "locations" | "categories" | "suppliers" | "reorder" | "system"
  >("warehouses");

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Data states
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"warehouse" | "location" | "category" | "supplier">("warehouse");
  const [editItem, setEditItem] = useState<any>(null);

  // Form fields
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    try {
      if (activeTab === "warehouses") {
        const res = await fetch("/api/warehouses?include_inactive=true");
        const data = await res.json();
        if (res.ok) setWarehouses(data.warehouses || []);
      } else if (activeTab === "locations") {
        const res = await fetch("/api/locations?include_inactive=true");
        const data = await res.json();
        if (res.ok) setLocations(data.locations || []);
        const whRes = await fetch("/api/warehouses");
        const whData = await whRes.json();
        if (whRes.ok) setWarehouses(whData.warehouses || []);
      } else if (activeTab === "categories") {
        const res = await fetch("/api/categories?include_inactive=true");
        const data = await res.json();
        if (res.ok) setCategories(data.categories || []);
      } else if (activeTab === "suppliers") {
        const res = await fetch("/api/suppliers?include_inactive=true");
        const data = await res.json();
        if (res.ok) setSuppliers(data.suppliers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreate = (type: "warehouse" | "location" | "category" | "supplier") => {
    setModalType(type);
    setEditItem(null);
    setFormData({});
    setShowModal(true);
  };

  const handleOpenEdit = (type: "warehouse" | "location" | "category" | "supplier", item: any) => {
    setModalType(type);
    setEditItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    let url = "";
    let method = editItem ? "PUT" : "POST";

    if (modalType === "warehouse") url = "/api/warehouses";
    else if (modalType === "location") url = "/api/locations";
    else if (modalType === "category") url = "/api/categories";
    else if (modalType === "supplier") url = "/api/suppliers";

    const payload = editItem ? { id: editItem.id, ...formData } : { ...formData };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`${modalType.toUpperCase()} saved successfully!`);
        setShowModal(false);
        loadAllData();
      } else {
        setError(data.error || "Action failed");
      }
    } catch (err: any) {
      setError("An unexpected error occurred.");
    }
  };

  const handleDeleteItem = async (type: "warehouse" | "location" | "category" | "supplier", id: number) => {
    if (!confirm(`Are you sure you want to deactivate/delete this ${type}?`)) return;
    setError(null);
    setMessage(null);

    let url = "";
    if (type === "warehouse") url = `/api/warehouses?id=${id}`;
    else if (type === "location") url = `/api/locations?id=${id}`;
    else if (type === "category") url = `/api/categories?id=${id}`;
    else if (type === "supplier") url = `/api/suppliers?id=${id}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || `${type.toUpperCase()} removed.`);
        loadAllData();
      } else {
        setError(data.error || "Delete failed");
      }
    } catch (err) {
      setError("Error executing delete.");
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-zinc-500">Loading settings module...</div>;
  }

  const isManager =
    currentUser?.role === "INVENTORY_MANAGER" || currentUser?.role === "ADMIN";

  const handleReactivateItem = async (type: "warehouse" | "location" | "category" | "supplier", item: any) => {
    setError(null);
    setMessage(null);

    let url = "";
    if (type === "warehouse") url = "/api/warehouses";
    else if (type === "location") url = "/api/locations";
    else if (type === "category") url = "/api/categories";
    else if (type === "supplier") url = "/api/suppliers";

    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, active: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`${type.toUpperCase()} reactivated successfully.`);
        loadAllData();
      } else {
        setError(data.error || "Failed to reactivate");
      }
    } catch {
      setError("Error reactivating item.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-blue-600 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> Administrative System Settings
          </h1>
          <p className="text-xs text-zinc-600 mt-1 font-medium">
            Configure warehouses, locations, product categories, suppliers, and system defaults.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-extrabold rounded-full flex items-center gap-1.5 shadow-xs shadow-blue-500/20">
            <Shield className="w-3.5 h-3.5" />
            {isManager ? "Inventory Manager Access" : "Read-Only View"}
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-black shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveTab("warehouses")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
            activeTab === "warehouses"
              ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold"
          }`}
        >
          <Warehouse className="w-4 h-4" /> Warehouses
        </button>

        <button
          onClick={() => setActiveTab("locations")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
            activeTab === "locations"
              ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold"
          }`}
        >
          <MapPin className="w-4 h-4" /> Locations
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
            activeTab === "categories"
              ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold"
          }`}
        >
          <Tag className="w-4 h-4" /> Categories
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
            activeTab === "suppliers"
              ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold"
          }`}
        >
          <Truck className="w-4 h-4" /> Suppliers
        </button>

        <button
          onClick={() => setActiveTab("reorder")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
            activeTab === "reorder"
              ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold"
          }`}
        >
          <Sliders className="w-4 h-4" /> Reorder Config
        </button>

        <button
          onClick={() => setActiveTab("system")}
          className={`flex items-center gap-2 px-4 py-2 font-bold rounded-xl transition-all ${
            activeTab === "system"
              ? "bg-blue-600 text-white shadow-xs shadow-blue-500/20"
              : "text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold"
          }`}
        >
          <Info className="w-4 h-4" /> System Info
        </button>
      </div>

      {/* TAB 1: WAREHOUSES */}
      {activeTab === "warehouses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Warehouse Sites ({warehouses.length})
            </h2>
            {isManager && (
              <button
                onClick={() => handleOpenCreate("warehouse")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Add Warehouse
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">
                        {wh.code}
                      </span>
                      <h3 className="font-bold text-zinc-950 text-sm">{wh.name}</h3>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        wh.active ? "bg-zinc-100 text-zinc-900 border border-zinc-300" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {wh.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {wh.address && <p className="text-xs text-zinc-600 mt-1.5">{wh.address}</p>}
                </div>

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-medium">
                    {wh.locations?.length || 0} Storage Locations
                  </span>

                  {isManager && (
                    <div className="flex items-center gap-1.5">
                      {!wh.active && (
                        <button
                          onClick={() => handleReactivateItem("warehouse", wh)}
                          title="Reactivate Warehouse"
                          className="p-1.5 text-emerald-700 hover:text-emerald-900 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit("warehouse", wh)}
                        title="Edit Warehouse"
                        className="p-1.5 text-zinc-600 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem("warehouse", wh.id)}
                        title={wh.active ? "Deactivate Warehouse" : "Delete Warehouse"}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-zinc-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: LOCATIONS */}
      {activeTab === "locations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Storage Locations ({locations.length})
            </h2>
            {isManager && (
              <button
                onClick={() => handleOpenCreate("location")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Add Location
              </button>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600 uppercase">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Location Name</th>
                  <th className="p-3.5">Warehouse</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Status</th>
                  {isManager && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-zinc-50/50">
                    <td className="p-3.5 font-mono font-bold">{loc.code}</td>
                    <td className="p-3.5 font-bold text-zinc-950">{loc.name}</td>
                    <td className="p-3.5 text-zinc-600">{loc.warehouse_name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[10px]">
                        {loc.location_type}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          loc.active ? "bg-zinc-100 text-black border border-zinc-300" : "bg-zinc-200 text-zinc-500"
                        }`}
                      >
                        {loc.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isManager && (
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit("location", loc)}
                            className="p-1.5 text-zinc-600 hover:text-black rounded-lg hover:bg-zinc-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem("location", loc.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Product Categories ({categories.length})
            </h2>
            {isManager && (
              <button
                onClick={() => handleOpenCreate("category")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-zinc-950 text-sm">{cat.name}</h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cat.active ? "bg-zinc-100 text-black border border-zinc-300" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {cat.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {cat.description && <p className="text-xs text-zinc-600 mt-1">{cat.description}</p>}
                </div>

                {isManager && (
                  <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit("category", cat)}
                      className="p-1.5 text-zinc-600 hover:text-black rounded-lg hover:bg-zinc-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem("category", cat.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Suppliers & Vendors ({suppliers.length})
            </h2>
            {isManager && (
              <button
                onClick={() => handleOpenCreate("supplier")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" /> Add Supplier
              </button>
            )}
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-600 uppercase">
                <tr>
                  <th className="p-3.5">Supplier Name</th>
                  <th className="p-3.5">Contact Person</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Status</th>
                  {isManager && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 font-medium">
                {suppliers.map((sup) => (
                  <tr key={sup.id} className="hover:bg-zinc-50/50">
                    <td className="p-3.5 font-bold text-zinc-950">{sup.name}</td>
                    <td className="p-3.5 text-zinc-700">{sup.contact_name || "—"}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{sup.email || "—"}</td>
                    <td className="p-3.5 font-mono text-zinc-600">{sup.phone || "—"}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sup.active ? "bg-zinc-100 text-black border border-zinc-300" : "bg-zinc-200 text-zinc-500"
                        }`}
                      >
                        {sup.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {isManager && (
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit("supplier", sup)}
                            className="p-1.5 text-zinc-600 hover:text-black rounded-lg hover:bg-zinc-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem("supplier", sup.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-zinc-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REORDER DEFAULTS */}
      {activeTab === "reorder" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm text-xs">
          <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
            Reorder & Inventory Threshold Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <span className="font-bold text-zinc-950 block">Default Safety Stock Level</span>
              <p className="text-zinc-600 text-[11px]">
                Global minimum threshold applied to newly created products if unassigned.
              </p>
              <input
                type="number"
                disabled={!isManager}
                defaultValue={10}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl font-bold font-mono"
              />
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
              <span className="font-bold text-zinc-950 block">Negative Inventory Prevention</span>
              <p className="text-zinc-600 text-[11px]">
                Enforce strict PostgreSQL transaction locks preventing negative stock values.
              </p>
              <div className="flex items-center gap-2 pt-1 font-bold text-black">
                <CheckCircle2 className="w-4 h-4 text-black" /> Strict Locking Active (`SELECT ... FOR UPDATE`)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM INFO */}
      {activeTab === "system" && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm text-xs">
          <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
            System & Database Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between">
              <span className="text-zinc-500 font-sans font-medium">Framework</span>
              <span className="font-bold text-black">Next.js 16 (App Router)</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between">
              <span className="text-zinc-500 font-sans font-medium">Database Layer</span>
              <span className="font-bold text-black">Neon PostgreSQL (`pg`)</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between">
              <span className="text-zinc-500 font-sans font-medium">Ledger Audit Mode</span>
              <span className="font-bold text-black">Atomic Database Transactions</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex justify-between">
              <span className="text-zinc-500 font-sans font-medium">Auth Provider</span>
              <span className="font-bold text-black">jose / JWT + Bcrypt</span>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-extrabold text-sm text-zinc-950 uppercase">
                {editItem ? "Edit" : "Create"} {modalType.toUpperCase()}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-black font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {modalType === "warehouse" && (
                <>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Warehouse Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Central Logistics Hub"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Warehouse Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. WH-MAIN"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Address</label>
                    <textarea
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street, City, Country"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl focus:outline-none focus:border-black font-medium"
                    />
                  </div>
                </>
              )}

              {modalType === "location" && (
                <>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Warehouse *</label>
                    <select
                      required
                      value={formData.warehouse_id || ""}
                      onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-bold"
                    >
                      <option value="">Select Warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Location Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Rack A-101"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Location Code *</label>
                    <input
                      type="text"
                      required
                      value={formData.code || ""}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. RACK-A101"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Location Type</label>
                    <select
                      value={formData.location_type || "STORAGE"}
                      onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-bold"
                    >
                      <option value="STORAGE">STORAGE</option>
                      <option value="RECEIVING">RECEIVING</option>
                      <option value="SHIPPING">SHIPPING</option>
                      <option value="DISPOSAL">DISPOSAL</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === "category" && (
                <>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Raw Materials"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Description</label>
                    <textarea
                      value={formData.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Category description..."
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                </>
              )}

              {modalType === "supplier" && (
                <>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Global Logistics Inc."
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={formData.contact_name || ""}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="supplier@domain.com"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-zinc-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 555-0199"
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl font-medium"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-xs shadow-blue-500/20 transition-all"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
