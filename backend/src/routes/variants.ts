import { Router } from "express";
import db from "../db.js";

const router = Router();

/**
 * GET /api/variants/:id
 * Get a single variant.
 */
router.get("/:id", (req, res) => {
  try {
    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(Number(req.params.id));

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    res.json(variant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/variants/:id
 * Update a variant's price and/or inventory.
 *
 * Expected body (all fields optional):
 * {
 *   "name": "Updated Name",
 *   "sku": "NEW-SKU",
 *   "price_cents": 1999,
 *   "inventory_count": 50
 * }
 */
router.put("/:id", (req, res) => {
  // TASK 2: Implement variant update
  // 1. Validate that the variant exists
  // 2. Validate: price_cents >= 0, inventory_count >= 0, sku is unique (if changed)
  // 3. Update the variant in the database
  // 4. Return the updated variant
  try {
    const id = Number(req.params.id);
    const { name, sku, price_cents, inventory_count } = req.body;

    const existingVariant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!existingVariant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    // Validate sku is unique if changed
    if (sku && sku !== existingVariant.sku) {
      const existingSku = db
        .prepare("SELECT * FROM variants WHERE sku = ? AND id != ?")
        .get(sku, id);
      if (existingSku) {
        return res.status(400).json({ error: "SKU already exists" });
      }
    }

    // Validate numbers
    if (price_cents !== undefined && (typeof price_cents !== "number" || price_cents < 0)) {
      return res.status(400).json({ error: "price_cents must be a positive number" });
    }
    if (inventory_count !== undefined && (typeof inventory_count !== "number" || inventory_count < 0)) {
       return res.status(400).json({ error: "inventory_count must be a positive number" });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (sku !== undefined) {
      updates.push("sku = ?");
      values.push(sku);
    }
    if (price_cents !== undefined) {
      updates.push("price_cents = ?");
      values.push(price_cents);
    }
    if (inventory_count !== undefined) {
      updates.push("inventory_count = ?");
      values.push(inventory_count);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);
      
      const query = `UPDATE variants SET ${updates.join(", ")} WHERE id = ?`;
      db.prepare(query).run(...values);
    }

    const updatedVariant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id);

    res.json(updatedVariant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/variants/:id
 * Delete a variant permanently.
 */
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    const variant = db
      .prepare("SELECT * FROM variants WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;

    if (!variant) {
      return res.status(404).json({ error: "Variant not found" });
    }

    // Prevent deleting the last variant of a product
    const siblingCount = db
      .prepare(
        "SELECT COUNT(*) AS count FROM variants WHERE product_id = ?"
      )
      .get(variant.product_id as number) as { count: number };

    if (siblingCount.count <= 1) {
      return res
        .status(400)
        .json({ error: "Cannot delete the last variant of a product" });
    }

    db.prepare("DELETE FROM variants WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
