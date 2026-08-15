import OBR, { type Item, type Theme } from "@owlbear-rodeo/sdk";
import { SEND_TO_LAYER_POPOVER_ID } from "./constants";
import { formatLayerName, LAYERS_TOP_TO_BOTTOM } from "./layers";
import { getNextMenuIndex, type MenuNavigationKey } from "./menuNavigation";
import { assignItems, readVirtualLayerState } from "./virtualLayerService";
import { orderedGroupIds, UNASSIGNED_ID } from "./virtualLayers";

const layerElement = document.getElementById("layers");
const statusElement = document.getElementById("status");
if (!(layerElement instanceof HTMLDivElement) || !(statusElement instanceof HTMLParagraphElement)) throw new Error("Send to Layer UI failed to initialize");
const layerContainer = layerElement;
const status = statusElement;
let unsubscribeTheme: (() => void) | undefined;
function setBusy(busy: boolean) { for (const button of layerContainer.querySelectorAll("button")) button.disabled = busy; }

async function move(destination: Item["layer"], virtualLayerId?: string) {
  setBusy(true); status.textContent = "";
  try {
    const selection = await OBR.player.getSelection();
    if (!selection?.length) { status.textContent = "No items are selected."; setBusy(false); return; }
    await assignItems(selection, virtualLayerId, destination);
    await OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
  } catch { status.textContent = "Unable to move the selected items."; setBusy(false); }
}

OBR.onReady(async () => {
  const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme.mode;
    document.documentElement.style.setProperty("--obr-paper", theme.background.paper);
    document.documentElement.style.setProperty("--obr-text", theme.text.primary);
    document.documentElement.style.setProperty("--obr-hover", `${theme.primary.main}24`);
  };
  applyTheme(await OBR.theme.getTheme()); unsubscribeTheme = OBR.theme.onChange(applyTheme);
  const role = await OBR.player.getRole();
  const state = await readVirtualLayerState();
  for (const layer of LAYERS_TOP_TO_BOTTOM) {
    const heading = document.createElement("button"); heading.type = "button"; heading.role = "menuitem";
    heading.className = "native-layer"; heading.textContent = formatLayerName(layer); heading.addEventListener("click", () => void move(layer as Item["layer"])); layerContainer.append(heading);
    if (role === "GM") {
      if (state.layers.some((entry) => entry.obrLayer === layer)) {
        for (const groupId of orderedGroupIds(state, layer as Item["layer"])) {
          const definition = state.layers.find((entry) => entry.id === groupId);
          const button = document.createElement("button"); button.type = "button"; button.role = "menuitem";
          button.className = `virtual-layer${groupId === UNASSIGNED_ID ? " unassigned" : ""}`;
          button.textContent = definition?.name ?? "Unassigned";
          button.addEventListener("click", () => void move(layer as Item["layer"], definition?.id)); layerContainer.append(button);
        }
      }
    }
  }
  const buttons = [...layerContainer.querySelectorAll("button")]; buttons.forEach((button, index) => button.tabIndex = index === 0 ? 0 : -1);
  layerContainer.addEventListener("keydown", (event) => {
    const current = buttons.findIndex((button) => button === document.activeElement);
    if (event.key === "Escape") { event.preventDefault(); void OBR.popover.close(SEND_TO_LAYER_POPOVER_ID); return; }
    const keys: MenuNavigationKey[] = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (keys.includes(event.key as MenuNavigationKey)) { const next = getNextMenuIndex(current, buttons.length, event.key as MenuNavigationKey); event.preventDefault(); buttons.forEach((button, index) => button.tabIndex = index === next ? 0 : -1); buttons[next].focus(); }
  });
  requestAnimationFrame(() => buttons[0]?.focus());
});
window.addEventListener("beforeunload", () => unsubscribeTheme?.());
