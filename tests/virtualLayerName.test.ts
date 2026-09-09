import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalizeVirtualLayerName,
  canonicalVirtualLayerIdentity,
  formatVirtualLayerPath,
  guardianVirtualLayerPath,
  isDependentVirtualLayerPath,
  parseVirtualLayerPath,
} from "../src/virtualLayerName.ts";

test("parses every path segment semantically and preserves capitalization", () => {
  assert.deepEqual(parseVirtualLayerPath(" House :floor 1 / Lights :  on / Floor props "), {
    segments: [
      { kind: "state", group: "House", state: "floor 1" },
      { kind: "state", group: "Lights", state: "on" },
      { kind: "plain", name: "Floor props" },
    ],
  });
});

test("formats the canonical delimiter whitespace", () => {
  const parsed = parseVirtualLayerPath(" House :floor 1 / Lights :  on ");
  assert.ok(parsed);
  assert.equal(formatVirtualLayerPath(parsed), "House: floor 1/Lights: on");
  assert.equal(canonicalizeVirtualLayerName(" House :floor 1 / Lights :  on "), "House: floor 1/Lights: on");
});

test("uses a case-insensitive canonical full-path identity", () => {
  assert.equal(canonicalVirtualLayerIdentity("HOUSE : Floor 1 / lights:on"), "house: floor 1/lights: on");
  assert.equal(canonicalVirtualLayerIdentity("House: floor 1/Lights: on"), "house: floor 1/lights: on");
});

test("identifies dependency and returns the immediate guardian path", () => {
  const parsed = parseVirtualLayerPath("House: floor 1/Lights: on/Emergency: active");
  assert.ok(parsed);
  assert.equal(isDependentVirtualLayerPath(parsed), true);
  assert.equal(formatVirtualLayerPath(guardianVirtualLayerPath(parsed)!), "House: floor 1/Lights: on");
  assert.equal(guardianVirtualLayerPath(parseVirtualLayerPath("House: floor 1")!), undefined);
});

test("rejects empty names, path segments, groups, and states", () => {
  for (const value of ["", " ", "/", "House/", "/House", "House//Lights", ": floor 1", "House: "]) {
    assert.equal(parseVirtualLayerPath(value), undefined, value);
    assert.throws(() => canonicalizeVirtualLayerName(value));
  }
});

test("keeps additional colons inside state names", () => {
  assert.deepEqual(parseVirtualLayerPath("Castle: Night:Storm"), {
    segments: [{ kind: "state", group: "Castle", state: "Night:Storm" }],
  });
  assert.equal(canonicalizeVirtualLayerName("Castle : Night:Storm"), "Castle: Night:Storm");
});
