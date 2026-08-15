import OBR from "@owlbear-rodeo/sdk";
import type { Theme } from "@owlbear-rodeo/sdk";
import { SEND_TO_LAYER_POPOVER_ID } from "./constants";
import { formatLayerName, LAYERS_TOP_TO_BOTTOM } from "./layers";
import {
  getNextMenuIndex,
  type MenuNavigationKey,
} from "./menuNavigation";

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
  const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme.mode;
    document.documentElement.style.setProperty(
      "--obr-paper",
      theme.background.paper
    );
    document.documentElement.style.setProperty(
      "--obr-text",
      theme.text.primary
    );
    document.documentElement.style.setProperty(
      "--obr-hover",
      `${theme.primary.main}24`
    );
  };
  applyTheme(await OBR.theme.getTheme());
  unsubscribeTheme = OBR.theme.onChange(applyTheme);

  for (const [index, layer] of LAYERS_TOP_TO_BOTTOM.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "menuitem";
    button.tabIndex = index === 0 ? 0 : -1;
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

  const buttons = [...layerContainer.querySelectorAll("button")];
  layerContainer.addEventListener("keydown", (event) => {
    const currentIndex = buttons.findIndex(
      (button) => button === document.activeElement
    );
    if (event.key === "Escape") {
      event.preventDefault();
      void OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
      return;
    }

    const navigationKeys: MenuNavigationKey[] = [
      "ArrowDown",
      "ArrowUp",
      "Home",
      "End",
    ];
    if (navigationKeys.includes(event.key as MenuNavigationKey)) {
      const nextIndex = getNextMenuIndex(
        currentIndex,
        buttons.length,
        event.key as MenuNavigationKey
      );
      event.preventDefault();
      for (const [index, button] of buttons.entries()) {
        button.tabIndex = index === nextIndex ? 0 : -1;
      }
      buttons[nextIndex].focus();
    }
  });

  requestAnimationFrame(() => buttons[0]?.focus());
});

window.addEventListener("beforeunload", () => unsubscribeTheme?.());
