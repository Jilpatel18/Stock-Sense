"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Package,
  ArrowRight,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  product_count?: number;
}

export default function CategoriesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Modal / Form states
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  const fetchUserAndData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch("/api/auth/me");
      if (userRes.ok) {
        const data = await userRes.json();
        setCurrentUser(data.user);
      }

      await loadCategories();
    } catch (err) {
      console.error("Error loading categories page:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/categories?include_inactive=true");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const handleOpenCreate = () => {
    setEditItem(null);
    setFormData({ name: "", code: "", description: "" });
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditItem(category);
    setFormData({
      name: category.name || "",
      code: category.code || "",
      description: category.description || "",
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError("Category Name and Code are required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    const method = editItem ? "PUT" : "POST";
    const payload = editItem ? { id: editItem.id, ...formData } : { ...formData };

    try {
      const res = await fetch("/api/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`Category ${editItem ? "updated" : "created"} successfully!`);
        setShowModal(false);
        await loadCategories();
      } else {
        setError(data.error || "Failed to save category.");
      }
    } catch (err) {
      setError("An unexpected error occurred while saving.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to deactivate/delete this category?")) return;
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(data.message || "Category removed successfully.");
        await loadCategories();
      } else {
        setError(data.error || "Failed to delete category.");
      }
    } catch (err) {
      setError("An error occurred during deletion.");
    }
  };

  const isManager = currentUser?.role === "INVENTORY_MANAGER";

  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500 font-bold animate-pulse">
        Loading Categories...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-950 tracking-tight flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-black" /> Product Categories
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Organize inventory items by logical groups, codes, and classifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isManager && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Search & Stats Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search category name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-zinc-600 self-end md:self-auto">
          <span>Total Categories: <strong className="text-black">{categories.length}</strong></span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
          <span>Active: <strong className="text-black">{categories.filter(c => c.is_active).length}</strong></span>
        </div>
      </div>

      {/* Category Grid */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 bg-zinc-50 border border-dashed border-zinc-300 rounded-2xl">
          <Layers className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-black">No categories found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? "No categories match your search terms." : "Start by creating your first product category."}
          </p>
          {isManager && !searchQuery && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4" /> Create Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className={`p-5 rounded-2xl border transition-all bg-white flex flex-col justify-between ${
                cat.is_active ? "border-zinc-200 hover:border-black" : "border-zinc-200 bg-zinc-50/60 opacity-75"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                      <Tag className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-black leading-tight">{cat.name}</h3>
                      <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {cat.code}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                      cat.is_active
                        ? "bg-zinc-100 text-black border-zinc-300"
                        : "bg-zinc-200 text-zinc-600 border-zinc-300"
                    }`}
                  >
                    {cat.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 mt-3 line-clamp-2 min-h-[2.5rem]">
                  {cat.description || "No description provided."}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <Link
                  href={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="font-bold text-black hover:underline flex items-center gap-1"
                >
                  <Package className="w-3.5 h-3.5" />
                  View Products
                </Link>

                {isManager && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-700 hover:text-black transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {cat.is_active && (
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-black transition-colors"
                        title="Deactivate Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-zinc-300 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="font-extrabold text-base text-black flex items-center gap-2">
                <Tag className="w-5 h-5 text-black" />
                {editItem ? "Edit Category" : "Add New Category"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-black text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Category Name <span className="text-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Category Code <span className="text-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ELEC"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-black focus:outline-none focus:ring-1 focus:ring-black uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Optional details about this category..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-extrabold bg-black text-white hover:bg-zinc-800 rounded-xl disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editItem ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
