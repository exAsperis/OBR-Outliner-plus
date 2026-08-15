import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import OBR, { type Item } from "@owlbear-rodeo/sdk";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SEND_TO_LAYER_POPOVER_ID } from "./constants";
import { LayerIcon } from "./LayerIcon";
import { formatLayerName, getOutlinerLayers } from "./layers";
import { getNextMenuIndex, type MenuNavigationKey } from "./menuNavigation";
import { fitPopoverToViewport, type PopoverSize } from "./sendToLayerSizing";
import { assignItems, readVirtualLayerState } from "./virtualLayerService";
import {
  EMPTY_VIRTUAL_LAYER_STATE,
  orderedGroupIds,
  UNASSIGNED_ID,
  type VirtualLayerState,
} from "./virtualLayers";

export function SendToLayerApp() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const [state, setState] = useState<VirtualLayerState>(EMPTY_VIRTUAL_LAYER_STATE);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lastSize = useRef<PopoverSize>();
  const layers = useMemo(() => getOutlinerLayers(role), [role]);

  useEffect(() => {
    let active = true;
    void Promise.all([OBR.player.getRole(), readVirtualLayerState()]).then(
      ([nextRole, nextState]) => {
        if (!active) return;
        setRole(nextRole);
        setState(nextState);
        setLoaded(true);
      },
      () => {
        if (!active) return;
        setError("Unable to load destination layers.");
        setLoaded(true);
      },
    );
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    if (!loaded || !menuRef.current) return;
    const menu = menuRef.current;
    const resize = async () => {
      const [viewportWidth, viewportHeight] = await Promise.all([
        OBR.viewport.getWidth(),
        OBR.viewport.getHeight(),
      ]);
      const size = fitPopoverToViewport(
        menu.scrollWidth,
        menu.scrollHeight,
        viewportWidth,
        viewportHeight,
      );
      if (lastSize.current?.width === size.width && lastSize.current.height === size.height) return;
      lastSize.current = size;
      await Promise.all([
        OBR.popover.setWidth(SEND_TO_LAYER_POPOVER_ID, size.width),
        OBR.popover.setHeight(SEND_TO_LAYER_POPOVER_ID, size.height),
      ]);
    };
    const observer = new ResizeObserver(() => { void resize(); });
    observer.observe(menu);
    void resize();
    return () => observer.disconnect();
  }, [loaded, role, state, error]);

  useEffect(() => {
    if (!loaded) return;
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    buttons.forEach((button, index) => { button.tabIndex = index === 0 ? 0 : -1; });
    requestAnimationFrame(() => buttons[0]?.focus());
  }, [loaded, role, state]);

  async function move(destination: Item["layer"], virtualLayerId?: string) {
    setBusy(true);
    setError("");
    try {
      const selection = await OBR.player.getSelection();
      if (!selection?.length) {
        setError("No items are selected.");
        setBusy(false);
        return;
      }
      await assignItems(selection, virtualLayerId, destination);
      await OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
    } catch {
      setError("Unable to move the selected items.");
      setBusy(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      void OBR.popover.close(SEND_TO_LAYER_POPOVER_ID);
      return;
    }
    const keys: MenuNavigationKey[] = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key as MenuNavigationKey)) return;
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    const current = buttons.findIndex((button) => button === document.activeElement);
    const next = getNextMenuIndex(current, buttons.length, event.key as MenuNavigationKey);
    if (next < 0) return;
    event.preventDefault();
    buttons.forEach((button, index) => { button.tabIndex = index === next ? 0 : -1; });
    buttons[next].focus();
  }

  return (
    <div id="menu-viewport">
      <div
        id="layers"
        ref={menuRef}
        role="menu"
        aria-label="Destination layer"
        onKeyDown={handleKeyDown}
      >
        {loaded && layers.map((layer) => {
          const definitions = state.layers.filter((entry) => entry.obrLayer === layer);
          return (
            <div className="layer-group" key={layer}>
              <ListItemButton
                dense
                role="menuitem"
                disabled={busy}
                onClick={() => void move(layer)}
              >
                <ListItemIcon sx={{ color: "text.secondary", minWidth: "32px", "& svg": { fontSize: "1.25rem" } }}>
                  <LayerIcon layer={layer} />
                </ListItemIcon>
                <ListItemText primary={formatLayerName(layer)} />
              </ListItemButton>
              {definitions.length > 0 && orderedGroupIds(state, layer).map((groupId) => {
                const definition = definitions.find((entry) => entry.id === groupId);
                const unassigned = groupId === UNASSIGNED_ID;
                return (
                  <ListItemButton
                    dense
                    role="menuitem"
                    className={`virtual-layer${unassigned ? " unassigned" : ""}`}
                    disabled={busy}
                    key={groupId}
                    onClick={() => void move(layer, definition?.id)}
                  >
                    <ListItemText primary={definition?.name ?? "Unassigned"} />
                  </ListItemButton>
                );
              })}
            </div>
          );
        })}
        {error && <Typography id="status" role="status" aria-live="polite" color="error" variant="caption">{error}</Typography>}
      </div>
    </div>
  );
}
