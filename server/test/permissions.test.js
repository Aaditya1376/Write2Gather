import { test } from "node:test";
import assert from "node:assert/strict";
import { getRole, canEdit, hasRole } from "../src/utils/permissions.js";

const doc = {
  owner: "u1",
  collaborators: [
    { user: "u2", role: "editor" },
    { user: { _id: "u3" }, role: "viewer" },
  ],
  linkRole: "none",
};

test("owner is owner", () => assert.equal(getRole(doc, "u1"), "owner"));
test("collaborator roles are respected", () => {
  assert.equal(getRole(doc, "u2"), "editor");
  assert.equal(getRole(doc, "u3"), "viewer"); // works with populated users too
});
test("strangers get nothing when link sharing is off", () => assert.equal(getRole(doc, "u9"), null));
test("link sharing gives strangers the link role", () => {
  assert.equal(getRole({ ...doc, linkRole: "viewer" }, "u9"), "viewer");
  assert.equal(getRole({ ...doc, linkRole: "editor" }, "u9"), "editor");
});
test("link sharing can raise but never lower access", () => {
  assert.equal(getRole({ ...doc, linkRole: "editor" }, "u3"), "editor");
  assert.equal(getRole({ ...doc, linkRole: "viewer" }, "u2"), "editor");
});
test("helpers", () => {
  assert.equal(canEdit("viewer"), false);
  assert.equal(canEdit("editor"), true);
  assert.equal(hasRole("editor", "viewer"), true);
  assert.equal(hasRole(null, "viewer"), false);
});
