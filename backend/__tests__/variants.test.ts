import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import db from "../src/db";

describe("PUT /api/variants/:id", () => {
  let variantId1: number;
  let variantId2: number;

  beforeAll(() => {
    // Create a test product
    const product = db
      .prepare(
        "INSERT INTO products (name, status) VALUES ('Variant Test Product', 'active')"
      )
      .run();
    const productId = product.lastInsertRowid as number;

    // Create two test variants
    const v1 = db
      .prepare(
        "INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, 'VAR-TEST-SKU-1', 'Variant A', 1000, 10)"
      )
      .run(productId);
    variantId1 = v1.lastInsertRowid as number;

    const v2 = db
      .prepare(
        "INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, 'VAR-TEST-SKU-2', 'Variant B', 2000, 20)"
      )
      .run(productId);
    variantId2 = v2.lastInsertRowid as number;
  });

  afterAll(() => {
    db.prepare("DELETE FROM variants WHERE sku LIKE 'VAR-TEST-SKU-%'").run();
    db.prepare("DELETE FROM products WHERE name = 'Variant Test Product'").run();
  });

  it("updates variant fields successfully", async () => {
    const res = await request(app).put(`/api/variants/${variantId1}`).send({
      name: "Updated Variant A",
      price_cents: 1500,
      inventory_count: 5,
    });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Variant A");
    expect(res.body.price_cents).toBe(1500);
    expect(res.body.inventory_count).toBe(5);
    expect(res.body.sku).toBe("VAR-TEST-SKU-1"); // Unchanged
  });

  it("rejects duplicate sku", async () => {
    const res = await request(app).put(`/api/variants/${variantId1}`).send({
      sku: "VAR-TEST-SKU-2", // Already exists on variantId2
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("SKU already exists");
  });

  it("rejects negative price_cents", async () => {
    const res = await request(app).put(`/api/variants/${variantId1}`).send({
      price_cents: -500,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("price_cents must be a positive number");
  });

  it("rejects negative inventory_count", async () => {
    const res = await request(app).put(`/api/variants/${variantId1}`).send({
      inventory_count: -1,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("inventory_count must be a positive number");
  });

  it("returns 404 for non-existent variant", async () => {
    const res = await request(app).put("/api/variants/999999").send({
      price_cents: 1000,
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Variant not found");
  });
});
