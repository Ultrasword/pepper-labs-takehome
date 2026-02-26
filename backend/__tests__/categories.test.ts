import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import db from "../src/db.js";

describe("GET /api/categories", () => {
  it("returns 200 with an array of categories", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each category includes id, name, and product_count", async () => {
    const res = await request(app).get("/api/categories");
    for (const cat of res.body) {
      expect(cat).toHaveProperty("id");
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("product_count");
      expect(typeof cat.product_count).toBe("number");
    }
  });

  it("product_count is 0 for categories with no active products", async () => {
    // Insert a category with no products
    const result = db
      .prepare("INSERT INTO categories (name) VALUES ('Empty Test Category')")
      .run();
    const catId = result.lastInsertRowid as number;

    try {
      const res = await request(app).get("/api/categories");
      const found = res.body.find((c: { id: number }) => c.id === catId);
      expect(found).toBeDefined();
      expect(found.product_count).toBe(0);
    } finally {
      db.prepare("DELETE FROM categories WHERE id = ?").run(catId);
    }
  });

  it("categories are returned in alphabetical order by name", async () => {
    const res = await request(app).get("/api/categories");
    const names: string[] = res.body.map((c: { name: string }) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("soft-deleted products are excluded from product_count", async () => {
    // Find a category that has at least one active product
    const cat = db
      .prepare(
        `SELECT c.id, COUNT(p.id) AS cnt
         FROM categories c
         JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
         GROUP BY c.id
         HAVING cnt > 0
         LIMIT 1`
      )
      .get() as { id: number; cnt: number } | undefined;

    if (!cat) return; // Skip if seed data has no categorised products

    const beforeRes = await request(app).get(`/api/categories/${cat.id}`);
    const countBefore = (await request(app).get("/api/categories")).body.find(
      (c: { id: number; product_count: number }) => c.id === cat.id
    ).product_count;

    // Grab one active product in this category
    const product = db
      .prepare(
        "SELECT id FROM products WHERE category_id = ? AND deleted_at IS NULL LIMIT 1"
      )
      .get(cat.id) as { id: number };

    // Soft-delete it
    db.prepare("UPDATE products SET deleted_at = datetime('now') WHERE id = ?").run(product.id);

    try {
      const res = await request(app).get("/api/categories");
      const countAfter = res.body.find(
        (c: { id: number; product_count: number }) => c.id === cat.id
      ).product_count;
      expect(countAfter).toBe(countBefore - 1);
    } finally {
      // Restore the product
      db.prepare("UPDATE products SET deleted_at = NULL WHERE id = ?").run(product.id);
    }
  });
});

describe("GET /api/categories/:id", () => {
  let categoryId: number;

  beforeAll(() => {
    // Use an existing seeded category
    const cat = db.prepare("SELECT id FROM categories LIMIT 1").get() as {
      id: number;
    };
    categoryId = cat.id;
  });

  it("returns the category by id", async () => {
    const res = await request(app).get(`/api/categories/${categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(categoryId);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 404 for a non-existent category id", async () => {
    const res = await request(app).get("/api/categories/999999");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("error");
  });
});
