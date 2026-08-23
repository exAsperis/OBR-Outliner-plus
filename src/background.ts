import OBR from "@owlbear-rodeo/sdk";
import { EXTENSION_ID } from "./constants";
import { hasBoundaryViolation, stateFromMetadata } from "./virtualLayers";
import { isVirtualLayerWriteInFlight, normalizeLayers } from "./virtualLayerService";

const SEND_CONTEXT_MENU_ID = `${EXTENSION_ID}/send`;

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
  await OBR.contextMenu.create({
    id: SEND_CONTEXT_MENU_ID,
    icons: [
      {
        icon: "/send.svg?v=0.4.1",
        label: "Send…",
        filter: { permissions: ["UPDATE"] },
      },
    ],
    embed: {
      url: new URL(
        "/send-menu.html?v=0.4.1",
        window.location.origin
      ).href,
      height: 168,
    },
  });
});

window.addEventListener("beforeunload", () => {
  if (!ready) {
    return;
  }
  void OBR.contextMenu.remove(SEND_CONTEXT_MENU_ID);
  unsubscribeItems?.();
  unsubscribeMetadata?.();
});
