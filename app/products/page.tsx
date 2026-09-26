"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Building2,
  ChevronRight,
  X,
  Boxes,
} from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newUnit, setNewUnit] = useState("PCS");
  const [newReorderLevel, setNewReorderLevel] = useState("10");
  const [initialStock, setInitialStock] = useState("");
  const [initialLocation, setInitialLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Location detail modal
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const d = await res.json();
        setCategories(d.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const d = await res.json();
        setLocations(d.locations || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (selectedCategory !== "All") params.append("category_id", selectedCategory);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products || []);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          sku: newSku,
          category_id: newCategory || null,
          unit_of_measure: newUnit,
          reorder_level: newReorderLevel,
          initial_stock: initialStock,
          location_id: initialLocation,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowAddModal(false);
        setNewName("");
        setNewSku("");
        setInitialStock("");
        fetchProducts();
      } else {
        alert("Error: " + (data.error || "Failed to create product"));
      }
    } catch (err: any) {
      alert("Error creating product: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (lowStockOnly && !p.is_low_stock) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
            Product Catalog & Stock Breakdown
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Manage products, reorder thresholds, and location-level inventory quantities
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <a
            href="/api/products/export"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-300 shadow-xs transition-all"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-black text-white hover:bg-zinc-800 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name or SKU..."
            className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 pl-9 pr-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Low Stock Filter Button */}
          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`px-3 py-2 text-xs font-medium rounded-xl border flex items-center gap-1.5 transition-all ${
              lowStockOnly
                ? "bg-black text-white font-bold border-black"
                : "bg-zinc-50 border-zinc-300 text-zinc-700 hover:text-black"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Product List Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100 text-zinc-700 border-b border-zinc-200 font-bold text-[11px]">
              <tr>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Reorder Level</th>
                <th className="px-4 py-3">Total Stock</th>
                <th className="px-4 py-3">Stock Alert</th>
                <th className="px-4 py-3 text-right">Details & Locations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    Loading products catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-zinc-950">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-zinc-950 font-bold">{p.sku}</td>
                    <td className="px-4 py-3 text-zinc-600">{p.category_name || "Uncategorized"}</td>
                    <td className="px-4 py-3 uppercase text-[11px] font-mono text-zinc-500">{p.unit_of_measure}</td>
                    <td className="px-4 py-3 font-mono text-zinc-700">{p.reorder_level}</td>
                    <td className="px-4 py-3">
                      {parseFloat(p.total_stock) === 0 ? (
                        <span className="font-extrabold text-sm text-rose-600 font-mono">0</span>
                      ) : p.is_low_stock ? (
                        <span className="font-extrabold text-sm text-amber-600 font-mono">{p.total_stock}</span>
                      ) : (
                        <span className="font-extrabold text-sm text-zinc-950 font-mono">{p.total_stock}</span>
                      )}{" "}
                      <span className="text-[10px] text-zinc-500 font-mono">{p.unit_of_measure}</span>
                    </td>
                    <td className="px-4 py-3">
                      {parseFloat(p.total_stock) === 0 ? (
                        <StatusBadge status="Out of Stock" size="sm" />
                      ) : p.is_low_stock ? (
                        <StatusBadge status="Low Stock" size="sm" />
                      ) : (
                        <StatusBadge status="Healthy" size="sm" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedProduct(p)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-300 transition-colors"
                      >
                        Location Break-down
                      </button>
                      <Link
                        href={`/products/${p.id}`}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-black text-white hover:bg-zinc-800 transition-colors inline-flex items-center gap-1 shadow-sm"
                      >
                        Ledger History <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Breakdown Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-zinc-900" />
                  {selectedProduct.name}
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">SKU: {selectedProduct.sku}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-zinc-500 hover:text-zinc-900 p-1 rounded-lg hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="text-zinc-600">Total Company Stock:</span>
                <span className="font-extrabold text-sm text-zinc-950">
                  {selectedProduct.total_stock} {selectedProduct.unit_of_measure}
                </span>
              </div>

              <p className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                Location-Aware Inventory Breakdown
              </p>

              {selectedProduct.locations?.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">
                  No stock currently recorded at any location.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedProduct.locations?.map((loc: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-zinc-200 text-zinc-900 border border-zinc-300">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-950">{loc.location_name} ({loc.location_code})</p>
                          <p className="text-[10px] text-zinc-500">{loc.warehouse_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-zinc-950 text-sm">{loc.quantity}</span>{" "}
                        <span className="text-[10px] text-zinc-500">{selectedProduct.unit_of_measure}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold text-xs rounded-xl border border-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-base font-bold text-zinc-950">Create New Product</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-zinc-900 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Steel Rod 12mm"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="STEEL-002"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 font-mono uppercase focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="KG, PCS, Meters..."
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 uppercase focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Reorder Level Threshold</label>
                  <input
                    type="number"
                    required
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(e.target.value)}
                    placeholder="10"
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 px-3 py-2 focus:outline-none focus:border-black focus:ring-1 focus:ring-black placeholder-zinc-400"
                  />
                </div>
              </div>

              {/* Optional Initial Stock */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                <p className="text-[11px] font-bold text-zinc-800 uppercase tracking-wider">
                  Initial Stock Setup (Optional)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-1">Initial Quantity</label>
                    <input
                      type="number"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-zinc-300 rounded-lg text-xs text-zinc-950 px-2.5 py-1.5 focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-600 mb-1">Stock Location</label>
                    <select
                      value={initialLocation}
                      onChange={(e) => setInitialLocation(e.target.value)}
                      className="w-full bg-white border border-zinc-300 rounded-lg text-xs text-zinc-950 px-2.5 py-1.5 focus:outline-none focus:border-black"
                    >
                      <option value="">Select Location</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.warehouse_name} → {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl border border-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-black text-white font-extrabold hover:bg-zinc-800 text-xs rounded-xl shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
