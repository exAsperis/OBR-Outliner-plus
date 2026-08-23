import assert from "node:assert/strict";
import test from "node:test";
import { navigateSendMenu, SEND_ACTIONS } from "../src/sendMenu.ts";

test("lists stacking targets in Send menu order", () => {
  assert.deepEqual(SEND_ACTIONS, [
    { operation: "front", label: "to Front" },
    { operation: "forward", label: "Forward" },
    { operation: "backward", label: "Backward" },
    { operation: "back", label: "to Back" },
  ]);
});

test("drills into layers and returns to Send actions", () => {
  assert.equal(navigateSendMenu("actions", "open-layers"), "layers");
  assert.equal(navigateSendMenu("layers", "back"), "actions");
  assert.equal(navigateSendMenu("actions", "back"), "actions");
});
