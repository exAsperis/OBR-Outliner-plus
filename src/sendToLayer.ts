import OBR from "@owlbear-rodeo/sdk";
import { SEND_TO_LAYER_POPOVER_ID } from "./constants";
import { formatLayerName, LAYERS_TOP_TO_BOTTOM } from "./layers";

const layerElement = document.getElementById("layers");
const statusElement = document.getElementById("status");

if (
  !(layerElement instanceof HTMLDivElement) ||
  !(statusElement instanceof HTMLParagraphElement)
) {
  throw new Error("Send to Layer UI failed to initialize");
}

const layerContainer: HTMLDivElement = layerElement;
const status: HTMLParagraphElement = statusElement;
let unsubscribeTheme: (() => void) | undefined;

function setBusy(busy: boolean) {
  for (const button of layerContainer.querySelectorAll("button")) {
    button.disabled = busy;
  }
}

OBR.onReady(async () => {
  const applyTheme = (mode: "LIGHT" | "DARK") => {
    document.documentElement.dataset.theme = mode;
  };
  applyTheme((await OBR.theme.getTheme()).mode);
  unsubscribeTheme = OBR.theme.onChange((theme) => applyTheme(theme.mode));

  for (const layer of LAYERS_TOP_TO_BOTTOM) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "menuitem";
    button.textContent = formatLayerName(layer);
    button.addEventListener("click", async () => {
      setBusy(true);
      status.textContent = "";
      try {
        const selection = await OBR.player.getSelection();
        if (!selection?.length) {
          status.textContent = "No items are selected.";
          setBusy(false);
          return;
        }
        await OBR.scene.items.updateItems(selection, (items) => {
          for (const item of items) {
            // POST_PROCESS is accepted by current Owlbear but is not yet part
            // of this SDK version's Layer type.
            item.layer = layer as typeof item.layer;
          }
        });
        await OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
      } catch {
        status.textContent = "Unable to move the selected items.";
        setBusy(false);
      }
    });
    layerContainer.append(button);
  }
});

window.addEventListener("beforeunload", () => unsubscribeTheme?.());
