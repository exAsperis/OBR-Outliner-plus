import assert from "node:assert/strict";
import test from "node:test";
import { getItemActionVisibility } from "../src/itemActionVisibility.ts";

const defaults = {
  selected: false,
  hovering: false,
  focusWithin: false,
  layerMenuOpen: false,
  locked: false,
  visible: true,
  hasUpdatePermission: true,
  isGm: true,
};

test("hides the action row for an ordinary item at rest", () => {
  assert.deepEqual(getItemActionVisibility(defaults), {
    showActionRow: false,
    showGeneralActions: false,
    showLock: false,
    showVisibility: false,
    dimmed: true,
  });
});

for (const interaction of ["selected", "hovering", "focusWithin"] as const) {
  test(`shows all permitted actions while ${interaction}`, () => {
    assert.deepEqual(
      getItemActionVisibility({ ...defaults, [interaction]: true }),
      {
        showActionRow: true,
        showGeneralActions: true,
        showLock: true,
        showVisibility: true,
        dimmed: false,
      },
    );
  });
}

test("shows only the dimmed Show control for a hidden item at rest", () => {
  assert.deepEqual(
    getItemActionVisibility({ ...defaults, visible: false }),
    {
      showActionRow: true,
      showGeneralActions: false,
      showLock: false,
      showVisibility: true,
      dimmed: true,
    },
  );
});

test("shows only the dimmed Unlock control for a locked item at rest", () => {
  assert.deepEqual(
    getItemActionVisibility({ ...defaults, locked: true }),
    {
      showActionRow: true,
      showGeneralActions: false,
      showLock: true,
      showVisibility: false,
      dimmed: true,
    },
  );
});

test("shows both state-reversing controls when hidden and locked", () => {
  const result = getItemActionVisibility({
    ...defaults,
    locked: true,
    visible: false,
  });
  assert.equal(result.showLock, true);
  assert.equal(result.showVisibility, true);
  assert.equal(result.showGeneralActions, false);
  assert.equal(result.dimmed, true);
});

test("does not expose state controls without their permissions", () => {
  assert.deepEqual(
    getItemActionVisibility({
      ...defaults,
      locked: true,
      visible: false,
      hasUpdatePermission: false,
      isGm: false,
    }),
    {
      showActionRow: false,
      showGeneralActions: false,
      showLock: false,
      showVisibility: false,
      dimmed: true,
    },
  );
});

test("keeps general actions mounted while the layer menu is open", () => {
  const result = getItemActionVisibility({ ...defaults, layerMenuOpen: true });
  assert.equal(result.showActionRow, true);
  assert.equal(result.showGeneralActions, true);
  assert.equal(result.dimmed, true);
});
