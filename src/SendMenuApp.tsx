import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import SendToBackIcon from "@mui/icons-material/FlipToBackRounded";
import SendToFrontIcon from "@mui/icons-material/FlipToFrontRounded";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import SvgIcon from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import OBR, { type Item } from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatLayerName, getOutlinerLayers } from "./layers";
import { LayerIcon } from "./LayerIcon";
import { getNextMenuIndex, type MenuNavigationKey } from "./menuNavigation";
import { navigateSendMenu, SEND_ACTIONS, type SendMenuView } from "./sendMenu";
import { stackItems } from "./stackItems";
import { assignItems, readVirtualLayerState } from "./virtualLayerService";
import { EMPTY_VIRTUAL_LAYER_STATE, orderedGroupIds, UNASSIGNED_ID, type VirtualLayerState } from "./virtualLayers";

const STACK_ICONS = {
  front: SendToFrontIcon,
  forward: ArrowUpwardIcon,
  backward: ArrowDownwardIcon,
  back: SendToBackIcon,
};

function LayerMoveIcon() {
  return <SvgIcon fontSize="small"><path d="m8 2 7 3.5L8 9 1 5.5 8 2ZM2.7 9.4 8 12l5.3-2.6L15 11l-7 3.5L1 11l1.7-1.6Zm0 5L8 17l5.3-2.6L15 16l-7 3.5L1 16l1.7-1.6ZM17 7l5 5-5 5v-3h-3v-4h3V7Z" /></SvgIcon>;
}

export function SendMenuApp() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<SendMenuView>("actions");
  const [role, setRole] = useState<"GM" | "PLAYER">("PLAYER");
  const [state, setState] = useState<VirtualLayerState>(EMPTY_VIRTUAL_LAYER_STATE);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
        setError("Unable to load Send options.");
        setLoaded(true);
      },
    );
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
    buttons.forEach((button, index) => { button.tabIndex = index === 0 ? 0 : -1; });
    requestAnimationFrame(() => buttons[0]?.focus());
  }, [loaded, role, state, view]);

  async function selection() {
    const ids = await OBR.player.getSelection();
    if (!ids?.length) throw new Error("No items are selected.");
    return ids;
  }

  async function stack(operation: (typeof SEND_ACTIONS)[number]["operation"]) {
    setBusy(true);
    setError("");
    try {
      const ids = await selection();
      await stackItems(await OBR.scene.items.getItems(), ids, operation);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reorder the selected items.");
    } finally {
      setBusy(false);
    }
  }

  async function move(destination: Item["layer"], virtualLayerId?: string) {
    setBusy(true);
    setError("");
    try {
      await assignItems(await selection(), virtualLayerId, destination);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to move the selected items.");
    } finally {
      setBusy(false);
    }
  }

  function show(next: SendMenuView) {
    setError("");
    setView(next);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" && view === "layers") {
      event.preventDefault();
      show(navigateSendMenu(view, "back"));
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

  const iconSx = { color: "text.secondary", minWidth: "32px", "& svg": { fontSize: "1.25rem" } };
  return <div id="menu-viewport">
    <div id="send-menu" ref={menuRef} role="menu" aria-label={view === "actions" ? "Send" : "Destination layer"} onKeyDown={handleKeyDown}>
      {loaded && view === "actions" && <>
        {SEND_ACTIONS.map(({ operation, label }) => {
          const ActionIcon = STACK_ICONS[operation];
          return <ListItemButton dense role="menuitem" disabled={busy} key={operation} onClick={() => void stack(operation)}>
            <ListItemIcon sx={iconSx}><ActionIcon /></ListItemIcon><ListItemText primary={label} />
          </ListItemButton>;
        })}
        <ListItemButton dense role="menuitem" disabled={busy} onClick={() => show(navigateSendMenu(view, "open-layers"))}>
          <ListItemIcon sx={iconSx}><LayerMoveIcon /></ListItemIcon><ListItemText primary="to Layer" /><ChevronRightIcon color="action" fontSize="small" />
        </ListItemButton>
      </>}
      {loaded && view === "layers" && <>
        <ListItemButton dense role="menuitem" className="back-item" sx={{ bgcolor: "background.paper" }} disabled={busy} onClick={() => show(navigateSendMenu(view, "back"))}>
          <ListItemIcon sx={iconSx}><ArrowBackIcon /></ListItemIcon><ListItemText primary="Back" />
        </ListItemButton>
        {layers.map((layer) => {
          const definitions = state.layers.filter((entry) => entry.obrLayer === layer);
          return <div className="layer-group" key={layer}>
            <ListItemButton dense role="menuitem" disabled={busy} onClick={() => void move(layer)}>
              <ListItemIcon sx={iconSx}><LayerIcon layer={layer} /></ListItemIcon><ListItemText primary={formatLayerName(layer)} />
            </ListItemButton>
            {definitions.length > 0 && orderedGroupIds(state, layer).map((groupId) => {
              const definition = definitions.find((entry) => entry.id === groupId);
              const unassigned = groupId === UNASSIGNED_ID;
              return <ListItemButton dense role="menuitem" className={`virtual-layer${unassigned ? " unassigned" : ""}`} disabled={busy} key={groupId} onClick={() => void move(layer, definition?.id)}>
                <ListItemText primary={definition?.name ?? "Unassigned"} />
              </ListItemButton>;
            })}
          </div>;
        })}
      </>}
      {error && <Typography id="status" role="status" aria-live="polite" color="error" variant="caption">{error}</Typography>}
    </div>
  </div>;
}
