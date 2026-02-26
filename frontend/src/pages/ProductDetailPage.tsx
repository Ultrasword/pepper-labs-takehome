import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Package, Check, X } from "lucide-react";
import { fetchProduct, deleteProduct, updateVariant } from "@/lib/api";
import type { ProductDetail, Variant } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ProductNotFoundPage } from "@/components/ProductNotFoundPage";
import { PageErrorModal } from "@/components/PageErrorModal";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProduct(Number(id))
      .then((r) => {
        if (!r.ok) {
          setNotFoundMessage("The product you're looking for doesn't exist or may have been removed.");
          return null;
        }
        return r.json();
      })
      .then((data) => { if (data) setProduct(data); })
      .catch(() => setNotFoundMessage("The product you're looking for doesn't exist or may have been removed."));
  }, [id]);



  // Delete handler
  const confirmDelete = async () => {
    if (!id || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteProduct(Number(id));
      if (res.status === 409) {
        const data = await res.json();
        const deletedAt = data.deleted_at
          ? new Date(data.deleted_at + "Z").toLocaleString(undefined, {
              dateStyle: "long",
              timeStyle: "short",
            })
          : "an earlier time";
        setIsDeleteModalOpen(false);
        setDeleteError(`This product was already deleted on ${deletedAt}.`);
        return;
      }
      if (!res.ok) {
        setIsDeleteModalOpen(false);
        setDeleteError("Failed to delete the product. Please try again.");
        return;
      }
      setIsDeleteModalOpen(false);
      setDeleteSuccess(true);
      setProduct((prev) => (prev ? { ...prev, deleted_at: new Date().toISOString() } : prev));
      return;
    } catch (e) {
      console.error(e);
      setDeleteError("A network error occurred. Please try again.");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleVariantUpdate = (updatedVariant: Variant) => {
    setProduct((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        variants: prev.variants.map((v) =>
          v.id === updatedVariant.id ? updatedVariant : v
        ),
      };
    });
  };

  if (notFoundMessage) {
    return <ProductNotFoundPage message={notFoundMessage} />;
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/products"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      {/* Product header — card style */}
      <div className="mb-6 rounded-lg border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {product.name}
            </h1>
            {product.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {product.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                  product.deleted_at
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : product.status === "active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : product.status === "draft"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-gray-100 text-gray-600"
                )}
              >
                {product.deleted_at ? "Deleted & Invalid" : product.status}
              </span>
              {product.category_name && (
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {product.category_name}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isDeleting || !!product.deleted_at}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Variants table — card wrapped like CatalogList */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Variants ({product.variants.length})
        </h2>

        <div className="overflow-hidden rounded-lg border bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b bg-muted/50 transition-colors">
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SKU
                  </th>
                  <th className="h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Name
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Price
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Inventory
                  </th>
                  <th className="h-12 px-4 text-right align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {product.variants.map((v) => (
                  <VariantRow
                    key={v.id}
                    variant={v}
                    onUpdate={handleVariantUpdate}
                    disabled={!!product.deleted_at}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${product.name}"? This action cannot be undone.`}
        isConfirming={isDeleting}
      />

      <PageErrorModal
        isOpen={deleteError !== null}
        onClose={() => setDeleteError(null)}
        title="Product already deleted"
        message={deleteError ?? ""}
        autoRedirect={false}
      />

      <PageErrorModal
        isOpen={deleteSuccess}
        onClose={() => setDeleteSuccess(false)}
        variant="success"
        title="Product deleted"
        message={`"${product.name}" was successfully deleted. You'll be redirected to the catalogue shortly.`}
        autoRedirect={true}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function VariantRow({
  variant,
  onUpdate,
  disabled,
}: {
  variant: Variant;
  onUpdate: (updated: Variant) => void;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields stored as strings for input binding
  const [nameInput, setNameInput] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [inventoryInput, setInventoryInput] = useState("");

  const lowStock = variant.inventory_count > 0 && variant.inventory_count <= 10;
  const outOfStock = variant.inventory_count === 0;

  const startEditing = () => {
    // Initialise inputs from current variant values
    setNameInput(variant.name);
    setSkuInput(variant.sku);
    setPriceInput((variant.price_cents / 100).toFixed(2));
    setInventoryInput(String(variant.inventory_count));
    setError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    const trimmedName = nameInput.trim();
    const trimmedSku = skuInput.trim();
    const price = parseFloat(priceInput);
    const inventory = parseInt(inventoryInput, 10);

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedSku) {
      setError("SKU is required.");
      return;
    }

    if (isNaN(price) || price < 0) {
      setError("Price must be a non-negative number.");
      return;
    }
    if (isNaN(inventory) || inventory < 0) {
      setError("Inventory must be a non-negative whole number.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await updateVariant(variant.id, {
        name: trimmedName,
        sku: trimmedSku,
        price_cents: Math.round(price * 100),
        inventory_count: inventory,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save changes.");
        return;
      }

      const updated: Variant = await res.json();
      onUpdate(updated);
      setIsEditing(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <>
        <tr className="border-b bg-muted/30 transition-colors">
          <td className="p-4 align-middle">
            <input
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              className="w-32 rounded border border-input bg-background px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </td>
          <td className="p-4 align-middle">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-36 rounded border border-input bg-background px-2 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </td>
          {/* Price input */}
          <td className="p-4 text-right align-middle">
            <div className="inline-flex items-center justify-end">
              <span className="mr-1 text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-24 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </td>
          {/* Inventory input */}
          <td className="p-4 text-right align-middle">
            <input
              type="number"
              min="0"
              step="1"
              value={inventoryInput}
              onChange={(e) => setInventoryInput(e.target.value)}
              className="w-20 rounded border border-input bg-background px-2 py-1 text-right text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </td>
          {/* Save / Cancel */}
          <td className="p-4 text-right align-middle">
            <div className="inline-flex items-center gap-1.5">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          </td>
        </tr>
        {/* Inline error row */}
        {error && (
          <tr className="border-b bg-destructive/5">
            <td colSpan={5} className="px-4 py-1.5 text-xs text-destructive">
              {error}
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-4 align-middle font-mono text-xs">
        {variant.sku}
      </td>
      <td className="p-4 align-middle font-medium">{variant.name}</td>
      <td className="p-4 text-right align-middle tabular-nums">
        {formatPrice(variant.price_cents)}
      </td>
      <td className="p-4 text-right align-middle tabular-nums">
        <span
          className={cn(
            outOfStock && "text-destructive",
            lowStock && "text-amber-600"
          )}
        >
          {variant.inventory_count}
          {outOfStock && (
            <Package className="ml-1 inline h-3.5 w-3.5 text-destructive/60" />
          )}
        </span>
      </td>
      <td className="p-4 text-right align-middle">
        <button
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:pointer-events-none"
          onClick={startEditing}
          disabled={disabled}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </td>
    </tr>
  );
}
