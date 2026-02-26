# Submission

**Candidate name:** Petteri Kivimäki
**Date:** 2026-02-26
**Time spent:** 2 hours

---

## Completed Tasks

Check off what you finished:

- [x] Task 1 — Create Product
- [x] Task 2 — Update Variant
- [x] Task 3 — Fix soft-delete bug
- [x] Task 4 — Loading & error states
- [x] Task 5 — Input validation

---

## Approach & Decisions

_Briefly describe the approach you took for each task. Mention any trade-offs you made or alternative approaches you considered._

### Task 1

- frontend form validates inputs (name, price, inventory count) and also variants validation
- backend api also validates inputs (price, inventory count) and also variants validation
- i think this one was pretty straight forward so i just worked with Antigravity to finish this.


### Task 2

- Implemented `PUT /api/variants/:id` backend route to update variant details like price and inventory count. 
- Enforced SKU uniqueness validation globally (database wide).
- Added an edit flow on the product detail page to allow modification of price and inventory count.
- i think this one was also pretty straight forward so i just worked with Antigravity to finish this.

### Task 3

- Modified the product list SQL query to exclude products where `deleted_at IS NOT NULL`, properly hiding soft-deleted items.
- Chose to create a confirmation based delete system to prevent accidental deletion of products or spamming of delete button.
- also pretty straight forward

### Task 4

- Created a dedicated `ProductNotFoundPage` component to handle invalid or already deleted product IDs. Displayed to users when they try to delete.
- Added an automatic 3-second countdown redirect to the product catalogue on the 404 page. Less work for users and better UX.
- Implemented delete confirmation and UI state updates to handle successful product deletions.
- Created a shared modal `PageErrorModal` to handle errors and responses from the backend.

### Task 5

- Lowkey finished this in Part 1.
- Ensured product name is required, variant SKU is required and unique, price is non-negative, and inventory count is non-negative.

---

## What I'd improve with more time

_What would you add, refactor, or fix if you had another couple of hours?_

Since most listing dashboards generally require certain permissions for editing and performing management activities, I would eventually like to:

- add user auth with different permission levels
- verification systems

If I had more time or data, I would love to:

- see what UI designs (the auto redirect feature) are beneficial to UX
- create more detailed tests for specific features in the frontend (like testing delete button spam)

---
## Anything else?

_Optional — anything you want the reviewer to know (e.g. bugs you noticed, improvements you'd suggest to the existing code, etc.)._


I'd personally like to be able to view the SQL db via a UI like HeidiSQL or the SQL viewer on Mac (i forget the app name).

Aside from that, I have no complaints.

