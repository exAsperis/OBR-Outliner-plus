import OBR from "@owlbear-rodeo/sdk";
import { EXTENSION_ID, SEND_TO_LAYER_POPOVER_ID } from "./constants";
import { stackItems } from "./stackItems";
import type { StackOperation } from "./stacking";
import { hasBoundaryViolation, stateFromMetadata } from "./virtualLayers";
import { isVirtualLayerWriteInFlight, normalizeLayers } from "./virtualLayerService";

const commands: Array<{
  operation: StackOperation;
  label: string;
  icon: string;
}> = [
  {
    operation: "front",
    label: "Send to Front",
    icon: "/send-to-front.svg?v=0.4.0",
  },
  {
    operation: "forward",
    label: "Send Forward",
    icon: "/send-forward.svg?v=0.4.0",
  },
  {
    operation: "backward",
    label: "Send Backward",
    icon: "/send-backward.svg?v=0.4.0",
  },
  {
    operation: "back",
    label: "Send to Back",
    icon: "/send-to-back.svg?v=0.4.0",
  },
];

const SEND_TO_LAYER_CONTEXT_MENU_ID = `${EXTENSION_ID}/send-to-layer`;

let ready = false;
let unsubscribeItems: (() => void) | undefined;
let unsubscribeMetadata: (() => void) | undefined;
let reconcileQueued = false;

async function reconcile() {
  if (reconcileQueued || isVirtualLayerWriteInFlight() || !(await OBR.scene.isReady())) return;
  if ((await OBR.player.getRole()) !== "GM") return;
  reconcileQueued = true;
  try {
    const state = stateFromMetadata(await OBR.scene.getMetadata());
    if (!state.layers.length) return;
    const items = await OBR.scene.items.getItems();
    const layers = [...new Set(state.layers.map((entry) => entry.obrLayer))]
      .filter((layer) => hasBoundaryViolation(items, state, layer));
    if (layers.length) await normalizeLayers(layers, state);
  } finally { reconcileQueued = false; }
}

async function startReconciliation() {
  unsubscribeItems?.(); unsubscribeMetadata?.();
  if (!(await OBR.scene.isReady())) return;
  unsubscribeItems = OBR.scene.items.onChange(() => { void reconcile(); });
  unsubscribeMetadata = OBR.scene.onMetadataChange(() => { void reconcile(); });
  await reconcile();
}

OBR.onReady(async () => {
  ready = true;
  await startReconciliation();
  OBR.scene.onReadyChange(() => { void startReconciliation(); });
  for (const command of commands) {
    await OBR.contextMenu.create({
      id: `${EXTENSION_ID}/stack/${command.operation}`,
      icons: [
        {
          icon: command.icon,
          label: command.label,
          filter: { permissions: ["UPDATE"] },
        },
      ],
      async onClick(context) {
        if (!context.items.length) {
          return;
        }
        const sceneItems = await OBR.scene.items.getItems();
        await stackItems(
          sceneItems,
          context.items.map((item) => item.id),
          command.operation
        );
      },
    });
  }

  await OBR.contextMenu.create({
    id: SEND_TO_LAYER_CONTEXT_MENU_ID,
    icons: [
      {
        icon: "/send-to-layer.svg?v=0.4.0",
        label: "Send to Layer",
        filter: { permissions: ["UPDATE"] },
      },
    ],
    onClick(_context, elementId) {
      return OBR.popover.open({
        id: SEND_TO_LAYER_POPOVER_ID,
        url: new URL(
          "/send-to-layer.html?v=0.4.0",
          window.location.origin
        ).href,
        width: 184,
        height: 384,
        anchorElementId: elementId,
        anchorReference: "ELEMENT",
        anchorOrigin: { horizontal: "RIGHT", vertical: "TOP" },
        transformOrigin: { horizontal: "LEFT", vertical: "TOP" },
        marginThreshold: 8,
      });
    },
  });
});

window.addEventListener("beforeunload", () => {
  if (!ready) {
    return;
  }
  for (const command of commands) {
    void OBR.contextMenu.remove(
      `${EXTENSION_ID}/stack/${command.operation}`
    );
  }
  void OBR.contextMenu.remove(SEND_TO_LAYER_CONTEXT_MENU_ID);
  void OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
  unsubscribeItems?.();
  unsubscribeMetadata?.();
});
