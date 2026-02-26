import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import type { Category, ProductDetail } from "../types";

export default function CreateProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [status, setStatus] = useState<"active" | "draft" | "archived">("draft");

  const [variants, setVariants] = useState<
    { sku: string; name: string; priceStr: string; inventoryCount: string }[]
  >([{ sku: "", name: "", priceStr: "", inventoryCount: "0" }]);

  useEffect(() => {
    fetch("http://localhost:3001/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  const addVariant = () => {
    setVariants([...variants, { sku: "", name: "", priceStr: "", inventoryCount: "0" }]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: "sku" | "name" | "priceStr" | "inventoryCount", value: string) => {
    const newVariants = [...variants];
    const target = newVariants[index];
    if (target) {
      newVariants[index] = { ...target, [field]: value };
      setVariants(newVariants);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsedVariants = variants.map((v) => ({
        sku: v.sku.trim(),
        name: v.name.trim(),
        price_cents: Math.round(parseFloat(v.priceStr) * 100) || 0,
        inventory_count: parseInt(v.inventoryCount, 10) || 0,
      }));

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId === "" ? null : Number(categoryId),
        status,
        variants: parsedVariants,
      };

      const res = await fetch("http://localhost:3001/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const product = await res.json() as ProductDetail;
      navigate(`/products/${product.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-16">
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Create New Product
      </h1>

      {/* ----------------------------------------------------------------
          TODO: Build the create-product form here.

          The form should collect:
            - Product name (required)
            - Description (optional)
            - Category (select from existing categories)
            - Status (active / draft)
            - At least one variant with:
                - SKU (required, must be unique)
                - Variant name (required)
                - Price (>= 0)
                - Inventory count (>= 0)

          On submit, POST to /api/products (see backend route for expected body shape).
          On success, redirect to the new product's detail page.
       ---------------------------------------------------------------- */}

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-xl border border-divider bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Basic Info</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <input
                type="text"
                required
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Apples"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional product description..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category *</label>
              <select
                required
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={categoryId.toString()}
                onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="" disabled hidden>-- Select a Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <select
                className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "draft" | "archived")}
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-divider bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Variants *</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            A product must have at least one variant.
          </p>
          <div className="space-y-4">
            {variants.map((v, i) => (
              <div
                key={i}
                className="grid gap-4 rounded-lg border border-divider bg-background p-4 sm:grid-cols-5"
              >
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">SKU *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={v.sku}
                    onChange={(e) => updateVariant(i, "sku", e.target.value)}
                    placeholder="SKU-123"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={v.name}
                    onChange={(e) => updateVariant(i, "name", e.target.value)}
                    placeholder="e.g. 1 Dozen"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    value={v.priceStr}
                    onChange={(e) => updateVariant(i, "priceStr", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <label className="text-xs font-medium text-muted-foreground">Inventory</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      className="w-full rounded-md border border-divider bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      value={v.inventoryCount}
                      onChange={(e) => updateVariant(i, "inventoryCount", e.target.value)}
                    />
                    <button
                      type="button"
                      disabled={variants.length === 1}
                      onClick={() => removeVariant(i)}
                      className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Remove variant"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="mt-4 flex items-center gap-2 rounded-md border border-dashed border-divider bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            Add Variant
          </button>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            to="/products"
            className="rounded-md border border-divider bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
