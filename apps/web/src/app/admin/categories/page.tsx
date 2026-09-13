"use client";

import { useCallback, useEffect, useState } from "react";
import { useApiClient } from "@/lib/auth-context";
import type { Category } from "@spicycorner/shared";

export default function AdminCategoriesPage() {
  const apiClient = useApiClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    parentSlug: "",
    sortOrder: "0",
    published: true,
    seoTitle: "",
    seoDescription: "",
    image: "",
  });

  const load = useCallback(() => {
    setLoading(true);
    apiClient<{ categories: Category[] }>("/categories")
      .then((d) => setCategories(d.categories))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [apiClient]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      parentSlug: "",
      sortOrder: "0",
      published: true,
      seoTitle: "",
      seoDescription: "",
      image: "",
    });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      parentSlug: form.parentSlug || undefined,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      published: form.published,
      seoTitle: form.seoTitle || undefined,
      seoDescription: form.seoDescription || undefined,
      image: form.image || undefined,
    };
    try {
      if (editing) {
        await apiClient(`/categories/${editing.slug}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setMessage(`Category "${form.name}" updated`);
      } else {
        await apiClient("/categories", { method: "POST", body: JSON.stringify(payload) });
        setMessage(`Category "${form.name}" created`);
      }
      resetForm();
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description,
      parentSlug: c.parentSlug ?? "",
      sortOrder: String(c.sortOrder ?? 0),
      published: c.published !== false,
      seoTitle: c.seoTitle ?? "",
      seoDescription: c.seoDescription ?? "",
      image: c.image ?? "",
    });
  };

  const deleteCategory = async (slug: string) => {
    if (!confirm("Delete this category?")) return;
    await apiClient(`/categories/${slug}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold">Categories</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-xl p-6">
        <h2 className="font-semibold">{editing ? "Edit category" : "Add category"}</h2>
        <input
          placeholder="Category name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <select
            value={form.parentSlug}
            onChange={(e) => setForm({ ...form, parentSlug: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">No parent (top level)</option>
            {categories
              .filter((c) => c.slug !== editing?.slug)
              .map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
          <input
            type="number"
            placeholder="Display order"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
        </div>
        <input
          placeholder="Image URL"
          value={form.image}
          onChange={(e) => setForm({ ...form, image: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Meta title (SEO)"
          value={form.seoTitle}
          onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <textarea
          placeholder="Meta description (SEO)"
          value={form.seoDescription}
          onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={2}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Active / published
        </label>
        <div className="flex gap-2">
          <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg">
            {editing ? "Save changes" : "Publish category"}
          </button>
          {!form.published && !editing && (
            <button
              type="button"
              onClick={() => {
                setForm({ ...form, published: false });
              }}
              className="border px-4 py-2 rounded-lg text-sm"
            >
              Save as draft
            </button>
          )}
          {editing && (
            <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && <p className="text-sm">{message}</p>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <h2 className="font-semibold p-4 border-b">All categories</h2>
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="p-4 text-slate-600">No categories yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Parent</th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.slug} className="border-t">
                  <td className="py-3 px-4 font-medium">{c.name}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{c.slug}</td>
                  <td className="py-3 px-4 text-xs">{c.parentSlug ?? "—"}</td>
                  <td className="py-3 px-4">{c.sortOrder ?? 0}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.published !== false ? "bg-green-100 text-green-800" : "bg-slate-100"
                      }`}
                    >
                      {c.published !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      className="text-xs text-nav hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(c.slug)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
