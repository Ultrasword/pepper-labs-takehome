import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import db from "../src/db";

describe("Products API - POST /api/products", () => {
  beforeAll(() => {
    // We run tests against the same db, but let's clear whatever we create
    // We'll clean up our specific inserts in afterAll or delete them explicitly
  });

  afterAll(() => {
    db.prepare(`DELETE FROM variants WHERE sku LIKE 'TEST-SKU-%'`).run();
    db.prepare(`DELETE FROM products WHERE name LIKE 'Test Product %'`).run();
  });

  it("should create a product with a single variant", async () => {
    const payload = {
      name: "Test Product Single Variant",
      description: "A lovely test product",
      status: "active",
      variants: [
        {
          sku: "TEST-SKU-1",
          name: "Default",
          price_cents: 999,
          inventory_count: 50,
        },
      ],
    };

    const res = await request(app).post("/api/products").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe(payload.name);
    expect(res.body.variants).toHaveLength(1);
    expect(res.body.variants[0].sku).toBe("TEST-SKU-1");
  });

  it("should create a product with multiple variants", async () => {
    const payload = {
      name: "Test Product Multiple Variants",
      variants: [
        { sku: "TEST-SKU-2", name: "Small", price_cents: 500, inventory_count: 10 },
        { sku: "TEST-SKU-3", name: "Large", price_cents: 1000, inventory_count: 20 },
      ],
    };

    const res = await request(app).post("/api/products").send(payload);

    expect(res.status).toBe(201);
    expect(res.body.variants).toHaveLength(2);
    expect(res.body.variants[0].sku).toBe("TEST-SKU-2");
    expect(res.body.variants[1].sku).toBe("TEST-SKU-3");
  });

  it("should fail validation if name is missing", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        variants: [{ sku: "TEST-SKU-4", name: "X", price_cents: 0, inventory_count: 0 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Product name is required/);
  });

  it("should fail validation if variants are missing or empty", async () => {
    const res1 = await request(app).post("/api/products").send({ name: "Fail" });
    const res2 = await request(app).post("/api/products").send({ name: "Fail", variants: [] });

    expect(res1.status).toBe(400);
    expect(res1.body.error).toMatch(/At least one variant is required/);
    expect(res2.status).toBe(400);
    expect(res2.body.error).toMatch(/At least one variant is required/);
  });

  it("should fail validation if a variant is invalid", async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "Test Invalid Variant",
        variants: [{ sku: "TEST-SKU-5", name: "X", price_cents: -5, inventory_count: 0 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/requires price_cents >= 0/);
  });

  it("should block duplicate SKUs with a 409", async () => {
    const basePayload = {
      name: "Test Duplicate",
      variants: [{ sku: "TEST-SKU-DUP", name: "X", price_cents: 0, inventory_count: 0 }],
    };
    await request(app).post("/api/products").send(basePayload); // Success
    const res = await request(app).post("/api/products").send(basePayload); // Failure

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/SKUs are already in use/);
  });
});

describe("Products API - Soft Deletes", () => {
  let productId: number;

  // Create a fresh product before each test so each one starts clean
  beforeEach(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "Test Product SoftDelete",
        variants: [
          { sku: `TEST-SKU-SD-${Date.now()}`, name: "Default", price_cents: 100, inventory_count: 5 },
        ],
      });
    productId = res.body.id;
  });

  afterAll(() => {
    db.prepare(`DELETE FROM variants WHERE sku LIKE 'TEST-SKU-SD-%'`).run();
    db.prepare(`DELETE FROM products WHERE name = 'Test Product SoftDelete'`).run();
  });

  it("DELETE /api/products/:id sets deleted_at in the database", async () => {
    const res = await request(app).delete(`/api/products/${productId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the row was soft-deleted (deleted_at is now non-null)
    const row = db
      .prepare("SELECT deleted_at FROM products WHERE id = ?")
      .get(productId) as { deleted_at: string | null };

    expect(row).toBeDefined();
    expect(row.deleted_at).not.toBeNull();
  });

  it("GET /api/products excludes soft-deleted products from the list", async () => {
    // Soft-delete the product
    await request(app).delete(`/api/products/${productId}`);

    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    const ids = (res.body as { id: number }[]).map((p) => p.id);
    expect(ids).not.toContain(productId);
  });

  it("GET /api/products/:id returns 404 for a soft-deleted product", async () => {
    // Soft-delete the product
    await request(app).delete(`/api/products/${productId}`);

    const res = await request(app).get(`/api/products/${productId}`);

    expect(res.status).toBe(404);
  });
});

describe("Products API - GET /api/products (list)", () => {
  let createdId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "Test Product ListFilter",
        description: "Filterable product",
        variants: [
          { sku: "TEST-SKU-LIST-1", name: "Default", price_cents: 750, inventory_count: 12 },
        ],
      });
    createdId = res.body.id;
  });

  afterAll(() => {
    db.prepare("DELETE FROM variants WHERE sku LIKE 'TEST-SKU-LIST-%'").run();
    db.prepare("DELETE FROM products WHERE name LIKE 'Test Product ListFilter%'").run();
  });

  it("returns 200 with an array of products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each product includes aggregated fields", async () => {
    const res = await request(app).get("/api/products");
    const product = res.body.find((p: { id: number }) => p.id === createdId);
    expect(product).toBeDefined();
    expect(product).toHaveProperty("variant_count");
    expect(product).toHaveProperty("min_price_cents");
    expect(product).toHaveProperty("max_price_cents");
    expect(product).toHaveProperty("total_inventory");
    expect(product.variant_count).toBe(1);
    expect(product.min_price_cents).toBe(750);
    expect(product.total_inventory).toBe(12);
  });

  it("filters by ?search= matching product name", async () => {
    const res = await request(app).get("/api/products?search=ListFilter");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const ids = (res.body as { id: number }[]).map((p) => p.id);
    expect(ids).toContain(createdId);
  });

  it("?search= with no match returns empty array", async () => {
    const res = await request(app).get("/api/products?search=ZZZNOMATCH");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("filters by ?category_id= and excludes unrelated products", async () => {
    // category_id=9999 should return no results
    const res = await request(app).get("/api/products?category_id=9999");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it("excludes soft-deleted products from the list", async () => {
    await request(app).delete(`/api/products/${createdId}`);
    const res = await request(app).get("/api/products");
    const ids = (res.body as { id: number }[]).map((p) => p.id);
    expect(ids).not.toContain(createdId);
  });
});

describe("Products API - GET /api/products/:id", () => {
  let productId: number;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "Test Product GetById",
        variants: [
          { sku: "TEST-SKU-GBI-1", name: "Alpha", price_cents: 200, inventory_count: 3 },
          { sku: "TEST-SKU-GBI-2", name: "Beta", price_cents: 400, inventory_count: 7 },
        ],
      });
    productId = res.body.id;
  });

  afterAll(() => {
    db.prepare("DELETE FROM variants WHERE sku LIKE 'TEST-SKU-GBI-%'").run();
    db.prepare("DELETE FROM products WHERE name = 'Test Product GetById'").run();
  });

  it("returns the product with its variants", async () => {
    const res = await request(app).get(`/api/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(productId);
    expect(res.body.name).toBe("Test Product GetById");
    expect(Array.isArray(res.body.variants)).toBe(true);
    expect(res.body.variants).toHaveLength(2);
    const skus = res.body.variants.map((v: { sku: string }) => v.sku);
    expect(skus).toContain("TEST-SKU-GBI-1");
    expect(skus).toContain("TEST-SKU-GBI-2");
  });

  it("returns 404 for a non-existent product ID", async () => {
    const res = await request(app).get("/api/products/999999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Products API - PUT /api/products/:id", () => {
  let productId: number;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "Test Product PutUpdate",
        description: "Original description",
        variants: [
          { sku: `TEST-SKU-PUT-${Date.now()}`, name: "Default", price_cents: 100, inventory_count: 1 },
        ],
      });
    productId = res.body.id;
  });

  afterEach(() => {
    db.prepare("DELETE FROM variants WHERE sku LIKE 'TEST-SKU-PUT-%'").run();
    db.prepare("DELETE FROM products WHERE name LIKE 'Test Product PutUpdate%'").run();
  });

  it("updates name and description and returns the updated product", async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({ name: "Updated Name", description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.description).toBe("New description");
    expect(res.body.id).toBe(productId);
  });

  it("updates status field", async () => {
    const res = await request(app)
      .put(`/api/products/${productId}`)
      .send({ status: "archived" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("archived");
  });

  it("returns 404 for a non-existent product ID", async () => {
    const res = await request(app)
      .put("/api/products/999999")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});

describe("Products API - DELETE /api/products/:id (edge cases)", () => {
  let productId: number;

  beforeEach(async () => {
    const res = await request(app)
      .post("/api/products")
      .send({
        name: "Test Product DeleteEdge",
        variants: [
          { sku: `TEST-SKU-DEL-${Date.now()}`, name: "Default", price_cents: 100, inventory_count: 1 },
        ],
      });
    productId = res.body.id;
  });

  afterEach(() => {
    db.prepare("DELETE FROM variants WHERE sku LIKE 'TEST-SKU-DEL-%'").run();
    db.prepare("DELETE FROM products WHERE name = 'Test Product DeleteEdge'").run();
  });

  it("returns 404 when product ID has never existed", async () => {
    const res = await request(app).delete("/api/products/999999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 409 when attempting to delete an already soft-deleted product", async () => {
    // First delete succeeds
    await request(app).delete(`/api/products/${productId}`);
    // Second delete should conflict
    const res = await request(app).delete(`/api/products/${productId}`);
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
    expect(res.body).toHaveProperty("deleted_at");
  });
});
