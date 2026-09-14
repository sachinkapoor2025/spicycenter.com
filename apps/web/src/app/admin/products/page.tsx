"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useApiClient, useAuth } from "@/lib/auth-context";
import type { Product } from "@spicycorner/shared";
import {
  DEFAULT_PRODUCT_INVENTORY,
  LOW_STOCK_THRESHOLD,
  getUnitsSold,
  isFastSelling,
  productHasShippingDims,
  isCjDropshippingProduct,
} from "@spicycorner/shared";
import { formatMoney, downloadCsv } from "@/lib/admin-utils";
import { compressProductImage } from "@/lib/compress-product-image";
import { TableControls } from "@/components/admin/TableControls";

export default function AdminProductsPage() {
  const apiClient = useApiClient();
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    categorySlug: "",
    inventory: String(DEFAULT_PRODUCT_INVENTORY),
    currency: "USD" as "USD" | "INR",
    sku: "",
    compareAtPrice: "",
    tags: "",
    published: true,
    weightOz: "",
    lengthIn: "",
    widthIn: "",
    heightIn: "",
  });
  const [csv, setCsv] = useState("");
  const [message, setMessage] = useState("");
  const [lastSlug, setLastSlug] = useState("");
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "create">("list");
  const [missingDimsCount, setMissingDimsCount] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
    });
    if (search.trim()) qs.set("search", search.trim());
    Promise.all([
      apiClient<{ products: Product[]; total?: number }>("/admin/products?" + qs.toString()),
      apiClient<{ categories: { slug: string; name: string }[] }>("/categories"),
    ])
      .then(([p, c]) => {
        setProducts(p.products ?? []);
        setTotal(p.total ?? p.products?.length ?? 0);
        setCategories(c.categories ?? []);
        setMessage("");
      })
      .catch((err) => {
        setProducts([]);
        setTotal(0);
        setMessage(err instanceof Error ? err.message : "Could not load products.");
      })
      .finally(() => setLoading(false));
  }, [apiClient, page, pageSize, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const next = searchInput.trim();
    const t = window.setTimeout(() => {
      setSearch((prev) => {
        if (prev !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    apiClient<{ count: number }>("/admin/shipping/products-missing-dims")
      .then((d) => setMissingDimsCount(d.count))
      .catch(() => setMissingDimsCount(0));
  }, [apiClient, products]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = products;

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      categorySlug: categories[0]?.slug ?? "",
      inventory: String(DEFAULT_PRODUCT_INVENTORY),
      currency: "USD",
      sku: "",
      compareAtPrice: "",
      tags: "",
      published: true,
      weightOz: "",
      lengthIn: "",
      widthIn: "",
      heightIn: "",
    });
    setEditing(null);
  };

  const parseDim = (value: string, label: string): number | null => {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) {
      setMessage(`${label} is required and must be greater than 0.`);
      return null;
    }
    return n;
  };

  const shippingDimsPayload = () => {
    const weightOz = parseDim(form.weightOz, "Weight (oz)");
    if (weightOz == null) return null;
    const lengthIn = parseDim(form.lengthIn, "Length (in)");
    if (lengthIn == null) return null;
    const widthIn = parseDim(form.widthIn, "Width (in)");
    if (widthIn == null) return null;
    const heightIn = parseDim(form.heightIn, "Height (in)");
    if (heightIn == null) return null;
    return { weightOz, lengthIn, widthIn, heightIn };
  };

  const createProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const dims = shippingDimsPayload();
    if (!dims) return;
    try {
      const result = await apiClient<{ product: { slug: string } }>("/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
          inventory: parseInt(form.inventory, 10),
          categorySlug: form.categorySlug,
          currency: form.currency,
          sku: form.sku || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          published: form.published,
          ...dims,
        }),
      });
      setLastSlug(result.product.slug);
      setMessage(`Product "${form.name}" created!`);
      resetForm();
      load();
      setTab("list");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const dims = shippingDimsPayload();
    if (!dims) return;
    try {
      await apiClient(`/products/${editing.slug}`, {
        method: "PUT",
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          compareAtPrice: form.compareAtPrice ? parseFloat(form.compareAtPrice) : undefined,
          inventory: parseInt(form.inventory, 10),
          categorySlug: form.categorySlug,
          currency: form.currency,
          sku: form.sku || undefined,
          tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          published: form.published,
          ...dims,
        }),
      });
      setMessage(`Product "${form.name}" updated.`);
      resetForm();
      load();
      setTab("list");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    }
  };

  const startEdit = async (p: Product) => {
    try {
      const data = await apiClient<{ product: Product }>(`/admin/products/${encodeURIComponent(p.slug)}`);
      const full = data.product;
      setEditing(full);
      setForm({
        name: full.name,
        description: full.description,
        price: String(full.price),
        categorySlug: full.categorySlug,
        inventory: String(full.inventory),
        currency: full.currency,
        sku: full.sku ?? "",
        compareAtPrice: full.compareAtPrice ? String(full.compareAtPrice) : "",
        tags: full.tags?.join(", ") ?? "",
        published: full.published !== false,
        weightOz: full.weightOz != null ? String(full.weightOz) : "",
        lengthIn: full.lengthIn != null ? String(full.lengthIn) : "",
        widthIn: full.widthIn != null ? String(full.widthIn) : "",
        heightIn: full.heightIn != null ? String(full.heightIn) : "",
      });
      setTab("create");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not load product for editing.");
    }
  };

  const deleteProduct = async (slug: string) => {
    if (!confirm("Delete this product?")) return;
    await apiClient(`/products/${slug}`, { method: "DELETE" });
    load();
  };

  const saveStock = async (slug: string, inventory: number) => {
    if (!Number.isFinite(inventory) || inventory < 0) {
      setMessage("Stock must be 0 or greater.");
      return;
    }
    try {
      await apiClient(`/products/${slug}`, {
        method: "PUT",
        body: JSON.stringify({ inventory: Math.floor(inventory) }),
      });
      setMessage(`Stock updated for ${slug}.`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Stock update failed");
    }
  };

  const stockBadge = (inventory: number) => {
    if (inventory <= 0) {
      return (
        <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-800">
          Sold out
        </span>
      );
    }
    if (inventory <= LOW_STOCK_THRESHOLD) {
      return (
        <span className="ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
          Low
        </span>
      );
    }
    return null;
  };

  const revalidateStorefrontProduct = async (slug: string) => {
    if (!token) return;
    try {
      await fetch("/api/revalidate/product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slug }),
      });
    } catch {
      /* non-blocking */
    }
  };

  const bulkUpload = async () => {
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      setMessage("CSV needs header + at least one row");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    });

    try {
      const result = await apiClient<{ created: number; errors: unknown[] }>("/products/bulk", {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
      setMessage(`Bulk upload: ${result.created} created, ${result.errors.length} errors`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Bulk upload failed");
    }
  };

  const uploadImages = async (files: File[] | FileList, slug: string) => {
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (selectedFiles.length === 0) {
      setMessage("Select one or more image files.");
      return;
    }

    setUploadingSlug(slug);
    try {
      for (const file of selectedFiles) {
        const compressed = await compressProductImage(file);
        const contentType = compressed.type || "image/jpeg";
        const presign = await apiClient<{ uploadUrl: string; publicUrl: string }>("/uploads/presign", {
          method: "POST",
          body: JSON.stringify({ filename: compressed.name, contentType, productSlug: slug }),
        });
        await fetch(presign.uploadUrl, { method: "PUT", body: compressed, headers: { "Content-Type": contentType } });
        await apiClient(`/products/${slug}/images`, {
          method: "POST",
          body: JSON.stringify({ imageUrl: presign.publicUrl }),
        });
      }
      setMessage(
        `${selectedFiles.length} image${selectedFiles.length === 1 ? "" : "s"} uploaded for "${slug}". Visible on the website immediately after cache refresh.`
      );
      await revalidateStorefrontProduct(slug);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSlug(null);
    }
  };

  const deleteProductImage = async (slug: string, imageUrl: string, imageNumber: number) => {
    if (!confirm(`Delete image ${imageNumber} from this product?`)) return;
    setDeletingImage(`${slug}:${imageUrl}`);
    try {
      await apiClient(`/products/${slug}/images`, {
        method: "DELETE",
        body: JSON.stringify({ imageUrl }),
      });
      setMessage(`Image ${imageNumber} deleted from "${slug}".`);
      await revalidateStorefrontProduct(slug);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Image delete failed");
    } finally {
      setDeletingImage(null);
    }
  };

  const ProductForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4 bg-white border rounded-xl p-5">
      <input
        placeholder="Product name *"
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
        rows={3}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Price <span className="text-red-600">*</span>
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 9.99"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9.]/g, "") })}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">Selling price customers pay</span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Compare-at price</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 10.99 (optional)"
            value={form.compareAtPrice}
            onChange={(e) =>
              setForm({ ...form, compareAtPrice: e.target.value.replace(/[^0-9.]/g, "") })
            }
            className="w-full border rounded-lg px-3 py-2"
          />
          <span className="mt-1 block text-xs text-slate-500">
            List / MRP shown with strikethrough when higher than price
          </span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">SKU</span>
          <input
            type="text"
            placeholder="Optional"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Inventory</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 200"
            value={form.inventory}
            onChange={(e) => setForm({ ...form, inventory: e.target.value.replace(/[^0-9]/g, "") })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">
            Category <span className="text-red-600">*</span>
          </span>
          <select
            value={form.categorySlug}
            onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Currency</span>
          <select
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value as "USD" | "INR" })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="USD">USD</option>
            <option value="INR">INR</option>
          </select>
        </label>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">Shipping dimensions (required)</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            placeholder="Weight (oz) *"
            type="number"
            step="0.1"
            min="0.1"
            value={form.weightOz}
            onChange={(e) => setForm({ ...form, weightOz: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="Length (in) *"
            type="number"
            step="0.1"
            min="0.1"
            value={form.lengthIn}
            onChange={(e) => setForm({ ...form, lengthIn: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="Width (in) *"
            type="number"
            step="0.1"
            min="0.1"
            value={form.widthIn}
            onChange={(e) => setForm({ ...form, widthIn: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
          <input
            placeholder="Height (in) *"
            type="number"
            step="0.1"
            min="0.1"
            value={form.heightIn}
            onChange={(e) => setForm({ ...form, heightIn: e.target.value })}
            className="border rounded-lg px-3 py-2"
            required
          />
        </div>
        <p className="text-xs text-slate-500 mt-1">Used for USPS rate quotes and label purchase.</p>
      </div>
      <input
        placeholder="Tags (comma-separated)"
        value={form.tags}
        onChange={(e) => setForm({ ...form, tags: e.target.value })}
        className="w-full border rounded-lg px-3 py-2"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
        />
        Published (live on storefront)
      </label>
      <div className="flex gap-2">
        <button type="submit" className="bg-accent text-white px-6 py-2 rounded-lg">
          {submitLabel}
        </button>
        {editing && (
          <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setTab("list");
            }}
            className={`px-4 py-2 rounded-lg text-sm ${tab === "list" ? "bg-nav text-white" : "border"}`}
          >
            All products
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setTab("create");
            }}
            className={`px-4 py-2 rounded-lg text-sm ${tab === "create" ? "bg-nav text-white" : "border"}`}
          >
            {editing ? "Edit product" : "Add product"}
          </button>
        </div>
      </div>

      {missingDimsCount > 0 && (
        <div className="text-sm bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg flex flex-wrap items-center gap-2">
          <span>
            {missingDimsCount} product{missingDimsCount === 1 ? "" : "s"} missing shipping dimensions
          </span>
          <Link href="/admin/shipping" className="text-nav font-medium hover:underline">
            Review in Shipping settings →
          </Link>
        </div>
      )}

      {message && <p className="text-sm bg-slate-50 border p-3 rounded-lg">{message}</p>}

      {tab === "list" && (
        <>
          <input
            type="search"
            placeholder="Search by name, slug, SKU…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <TableControls
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : (
            <div className="bg-white border rounded-lg overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">CJ cost</th>
                    <th className="py-3 px-4">Price</th>
                    <th className="py-3 px-4">Added</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4">Sold</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p) => (
                    <tr key={p.slug} className="border-t align-top">
                      <td className="py-3 px-4">
                        <div className="font-medium flex items-center gap-1.5 flex-wrap">
                          {p.name}
                          {!productHasShippingDims(p) && (
                            <span
                              className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900"
                              title="Missing shipping dimensions"
                            >
                              No dims
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{p.slug}</div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{p.images?.length ?? 0} image{(p.images?.length ?? 0) === 1 ? "" : "s"}</span>
                            {uploadingSlug === p.slug && <span className="text-nav">Uploading...</span>}
                          </div>
                          {p.images?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {p.images.map((imageUrl, index) => {
                                const deleteKey = `${p.slug}:${imageUrl}`;
                                return (
                                  <div
                                    key={`${imageUrl}-${index}`}
                                    className="relative w-16 rounded-lg border bg-slate-50 p-1"
                                  >
                                    <span className="mb-1 block text-[10px] font-semibold text-slate-500">
                                      Image {index + 1}
                                    </span>
                                    <div className="h-12 w-full overflow-hidden rounded bg-white">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={imageUrl}
                                        alt={`${p.name} image ${index + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => deleteProductImage(p.slug, imageUrl, index + 1)}
                                      disabled={deletingImage === deleteKey}
                                      className="mt-1 w-full text-[10px] text-red-600 hover:underline disabled:opacity-50"
                                    >
                                      {deletingImage === deleteKey ? "Deleting" : "Delete"}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">No product images yet.</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">{p.sku ?? "—"}</td>
                      <td className="py-3 px-4">{p.categorySlug}</td>
                      <td className="py-3 px-4">
                        {isCjDropshippingProduct(p) && typeof p.vendorCost === "number"
                          ? formatMoney(p.vendorCost, "USD")
                          : "—"}
                      </td>
                      <td className="py-3 px-4">
                        {formatMoney(p.price, p.currency)}
                        {p.compareAtPrice && (
                          <div className="text-xs text-slate-400 line-through">
                            {formatMoney(p.compareAtPrice, p.currency)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isCjDropshippingProduct(p) && typeof p.vendorCost === "number" ? (
                          <span>
                            {formatMoney(p.price - p.vendorCost, p.currency)}
                            <span className="block text-xs text-slate-500">
                              {p.price > 0 ? `${(((p.price - p.vendorCost) / p.price) * 100).toFixed(0)}% margin` : ""}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <form
                          className="flex items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = (e.currentTarget.elements.namedItem("stock") as HTMLInputElement)
                              .value;
                            void saveStock(p.slug, parseInt(input, 10));
                          }}
                        >
                          <input
                            name="stock"
                            type="number"
                            min={0}
                            defaultValue={p.inventory ?? 0}
                            key={`${p.slug}-${p.inventory}`}
                            className="w-20 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            type="submit"
                            className="text-xs text-nav hover:underline whitespace-nowrap"
                          >
                            Save
                          </button>
                          {stockBadge(p.inventory ?? 0)}
                        </form>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold">{getUnitsSold(p)}</span>
                        {isFastSelling(p) && (
                          <span className="ml-1 text-[10px] font-bold text-orange-600 uppercase">Fast</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                            p.published !== false ? "bg-green-100 text-green-800" : "bg-slate-100"
                          }`}
                        >
                          {p.published !== false ? "Published" : "Draft"}
                        </span>
                        {(p.inventory ?? 0) <= 0 && p.published !== false && (
                          <span className="text-[10px] text-slate-500">Hidden from shop (sold out)</span>
                        )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="text-xs text-nav hover:underline mr-2"
                        >
                          Edit
                        </button>
                        <Link href={`/products/${p.slug}`} className="text-xs text-nav hover:underline mr-2">
                          View
                        </Link>
                        <label className="text-xs text-nav hover:underline cursor-pointer mr-2">
                          {uploadingSlug === p.slug ? "Uploading..." : "Add images"}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingSlug !== null}
                            onChange={(e) => {
                              if (e.currentTarget.files?.length) {
                                void uploadImages(e.currentTarget.files, p.slug);
                                e.currentTarget.value = "";
                              }
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteProduct(p.slug)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "create" && (
        <div className="space-y-8">
          <ProductForm
            onSubmit={editing ? saveEdit : createProduct}
            submitLabel={editing ? "Save changes" : "Create product"}
          />
          {!editing && lastSlug && (
            <div className="p-4 border rounded-lg bg-white">
              <p className="text-sm mb-2">
                Upload images for <code>{lastSlug}</code>
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploadingSlug !== null}
                onChange={(e) => {
                  if (e.currentTarget.files?.length) {
                    void uploadImages(e.currentTarget.files, lastSlug);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold mb-2">Bulk Upload (CSV)</h2>
            <p className="text-sm text-slate-600 mb-3">
              Download the sample template, fill in your products, then paste or upload the CSV below.
            </p>
            <button
              type="button"
              onClick={() =>
                downloadCsv("spicycorner-product-import-template.csv", [
                  [
                    "name",
                    "description",
                    "price",
                    "compareAtPrice",
                    "currency",
                    "categorySlug",
                    "sku",
                    "inventory",
                    "tags",
                    "seoTitle",
                    "seoDescription",
                    "published",
                  ],
                  [
                    "Premium spice Decoration",
                    "spice decoration as pictured",
                    "12.99",
                    "15.99",
                    "USD",
                    "spice-decoration",
                    "RAK-001",
                    "50",
                    "spice,decoration",
                    "Premium spice Decoration | SpicyCenter",
                    "Shop premium Indian spices with USA delivery",
                    "true",
                  ],
                ])
              }
              className="text-sm text-nav border border-nav px-4 py-2 rounded-lg hover:bg-nav/5 mb-4"
            >
              Download sample CSV template
            </button>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              placeholder={"name,description,price,categorySlug,inventory,currency,sku\n..."}
            />
            <button onClick={bulkUpload} className="mt-2 bg-slate-800 text-white px-6 py-2 rounded-lg">
              Upload CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
