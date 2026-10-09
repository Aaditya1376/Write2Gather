import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEmail, cleanPassword, cleanString, oneOf } from "../src/utils/validate.js";
import { assertObjectId } from "../src/utils/http.js";

test("cleanEmail lowercases and trims", () => assert.equal(cleanEmail("  Me@Example.COM "), "me@example.com"));
test("cleanEmail rejects junk", () => assert.throws(() => cleanEmail("nope"), { status: 400 }));
test("cleanPassword needs 8+ chars", () => {
  assert.throws(() => cleanPassword("short"), { status: 400 });
  assert.equal(cleanPassword("longenough1"), "longenough1");
});
test("cleanString enforces bounds", () => {
  assert.throws(() => cleanString("", { field: "Name" }), { status: 400 });
  assert.throws(() => cleanString("x".repeat(10), { field: "Name", max: 5 }), { status: 400 });
});
test("oneOf", () => {
  assert.equal(oneOf("editor", ["viewer", "editor"], "Role"), "editor");
  assert.throws(() => oneOf("admin", ["viewer", "editor"], "Role"), { status: 400 });
});
test("assertObjectId", () => {
  assert.doesNotThrow(() => assertObjectId("507f1f77bcf86cd799439011"));
  assert.throws(() => assertObjectId("abc"), { status: 404 });
});
