import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
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

  it("allows updating a variant's sku to its own current value (no-op sku)", async () => {
    const res = await request(app).put(`/api/variants/${variantId1}`).send({
      sku: "VAR-TEST-SKU-1", // Same as its current SKU — should not conflict
    });

    expect(res.status).toBe(200);
    expect(res.body.sku).toBe("VAR-TEST-SKU-1");
  });
});

describe("GET /api/variants/:id", () => {
  let variantId: number;

  beforeAll(() => {
    const product = db
      .prepare("INSERT INTO products (name, status) VALUES ('Variant GET Test Product', 'active')")
      .run();
    const v = db
      .prepare(
        "INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, 'VAR-GET-SKU-1', 'Get Me', 500, 3)"
      )
      .run(product.lastInsertRowid);
    variantId = v.lastInsertRowid as number;
  });

  afterAll(() => {
    db.prepare("DELETE FROM variants WHERE sku = 'VAR-GET-SKU-1'").run();
    db.prepare("DELETE FROM products WHERE name = 'Variant GET Test Product'").run();
  });

  it("returns the variant by id", async () => {
    const res = await request(app).get(`/api/variants/${variantId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(variantId);
    expect(res.body.sku).toBe("VAR-GET-SKU-1");
    expect(res.body.name).toBe("Get Me");
    expect(res.body.price_cents).toBe(500);
    expect(res.body.inventory_count).toBe(3);
  });

  it("returns 404 for a non-existent variant id", async () => {
    const res = await request(app).get("/api/variants/999999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("DELETE /api/variants/:id", () => {
  let productId: number;
  let variantIdA: number;
  let variantIdB: number;

  beforeAll(() => {
    const product = db
      .prepare("INSERT INTO products (name, status) VALUES ('Variant DELETE Test Product', 'active')")
      .run();
    productId = product.lastInsertRowid as number;

    const vA = db
      .prepare(
        "INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, 'VAR-DEL-SKU-A', 'Delete A', 100, 1)"
      )
      .run(productId);
    variantIdA = vA.lastInsertRowid as number;

    const vB = db
      .prepare(
        "INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, 'VAR-DEL-SKU-B', 'Delete B', 200, 2)"
      )
      .run(productId);
    variantIdB = vB.lastInsertRowid as number;
  });

  afterAll(() => {
    db.prepare("DELETE FROM variants WHERE sku LIKE 'VAR-DEL-SKU-%'").run();
    db.prepare("DELETE FROM products WHERE name = 'Variant DELETE Test Product'").run();
  });

  it("returns 404 for a non-existent variant id", async () => {
    const res = await request(app).delete("/api/variants/999999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("prevents deleting the last variant of a product", async () => {
    // Delete variantIdA first to leave only variantIdB
    await request(app).delete(`/api/variants/${variantIdA}`);

    // Attempting to delete the last remaining variant should be blocked
    const res = await request(app).delete(`/api/variants/${variantIdB}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/last variant/i);
  });

  it("successfully deletes a variant when siblings remain", async () => {
    // Re-insert variantIdA so we have two again
    const vA2 = db
      .prepare(
        "INSERT INTO variants (product_id, sku, name, price_cents, inventory_count) VALUES (?, 'VAR-DEL-SKU-A2', 'Delete A2', 300, 5)"
      )
      .run(productId);
    const newId = vA2.lastInsertRowid as number;

    const res = await request(app).delete(`/api/variants/${newId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm it's gone
    const check = db.prepare("SELECT * FROM variants WHERE id = ?").get(newId);
    expect(check).toBeUndefined();
  });
});
