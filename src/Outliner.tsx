import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import MinimizeIcon from "@mui/icons-material/CloseFullscreenRounded";
import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useMemo, useRef, useState } from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Header } from "./Header";
import { Items } from "./Items";
import { SearchField } from "./SearchField";
import { useOwlbearStore } from "./useOwlbearStore";
import { itemHasPermission } from "./hasPermission";
import { SettingsPanel } from "./SettingsPanel";
import { StateSwitcher } from "./StateSwitcher";
import { statefulVirtualLayerGroups } from "./virtualLayers";
import { ResizeHandles } from "./ResizeHandles";
import { clampDimension, DEFAULT_OUTLINER_LAYOUT_SETTINGS, MAX_OUTLINER_HEIGHT, readOutlinerLayoutSettings, type OutlinerDimensions, type OutlinerLayoutSettings, writeOutlinerLayoutSettings } from "./outlinerLayout";

export function Outliner() {
  const listRef = useRef<HTMLUListElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  const virtualLayers = useOwlbearStore((state) => state.virtualLayers);
  const virtualLayersReady = useOwlbearStore((state) => state.virtualLayersReady);
  const hasStateGroups = useMemo(() => statefulVirtualLayerGroups(virtualLayers).length > 0, [virtualLayers]);
  const savedLayout = useMemo(() => readOutlinerLayoutSettings(), []);
  const [layout, setLayout] = useState<OutlinerLayoutSettings>(savedLayout ?? DEFAULT_OUTLINER_LAYOUT_SETTINGS);
  const layoutRef = useRef(layout);
  const fullHeightInitialized = useRef(Boolean(savedLayout));
  const isMinimized = layout.mode === "minimized" && hasStateGroups;
  const activeDimensions = layout[isMinimized ? "minimized" : "full"];

  const updateProfile = (mode: "full" | "minimized", dimensions: OutlinerDimensions, persist: boolean) => {
    const next = { ...layoutRef.current, [mode]: dimensions };
    layoutRef.current = next;
    setLayout(next);
    if (persist) writeOutlinerLayoutSettings(next);
  };

  const setMode = (mode: "full" | "minimized") => {
    const next = { ...layoutRef.current, mode };
    layoutRef.current = next;
    setLayout(next);
    writeOutlinerLayoutSettings(next);
    const dimensions = next[mode];
    void OBR.action.setWidth(dimensions.width);
    if (mode === "full") void OBR.action.setHeight(dimensions.height);
  };

  useEffect(() => {
    if (!ResizeObserver) return;
    const updateHeight = () => {
      const switcherHeight = switcherRef.current?.getBoundingClientRect().height ?? 0;
      if (isMinimized) {
        const height = clampDimension(switcherHeight, 1, MAX_OUTLINER_HEIGHT);
        const minimized = layoutRef.current.minimized;
        if (height !== minimized.height) {
          void OBR.action.setHeight(height);
          updateProfile("minimized", { ...minimized, height }, true);
        }
      } else if (!fullHeightInitialized.current) {
        const listHeight = Math.max(listRef.current?.getBoundingClientRect().height ?? 0, 64);
        const height = clampDimension(listHeight + switcherHeight + 64 + 16, 129, MAX_OUTLINER_HEIGHT);
        fullHeightInitialized.current = true;
        void OBR.action.setHeight(height);
        updateProfile("full", { ...layoutRef.current.full, height }, true);
      }
    };
    const resizeObserver = new ResizeObserver(updateHeight);
    if (listRef.current) resizeObserver.observe(listRef.current);
    if (switcherRef.current) resizeObserver.observe(switcherRef.current);
    updateHeight();
    return () => resizeObserver.disconnect();
  }, [isMinimized]);

  useEffect(() => {
    void OBR.action.setWidth(activeDimensions.width);
    if (!isMinimized) void OBR.action.setHeight(activeDimensions.height);
  }, [activeDimensions.height, activeDimensions.width, isMinimized]);

  useEffect(() => {
    if (virtualLayersReady && layout.mode === "minimized" && !hasStateGroups) setMode("full");
  }, [hasStateGroups, layout.mode, virtualLayersReady]);

  const [search, setSearch] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // When a common key is pressed ensure the action is performed in OBR
    // This is done because the OBR window might not have focus so the
    // key won't be triggered
    async function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing into an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const role = useOwlbearStore.getState().role;
      const selection = useOwlbearStore.getState().selection;
      const permissions = useOwlbearStore.getState().permissions;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          e.preventDefault();
          e.stopPropagation();
          const items = await OBR.scene.items.getItems(selection);
          const canDelete = items.filter((item) =>
            itemHasPermission(item, "DELETE", permissions, role, OBR.player.id)
          );
          if (canDelete.length > 0) {
            await OBR.scene.items.deleteItems(canDelete.map((item) => item.id));
          }
          await OBR.player.deselect();
        }
      }
      if (e.key === "z") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          if (e.shiftKey) {
            await OBR.scene.history.redo();
          } else {
            await OBR.scene.history.undo();
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <Stack
      height="100vh"
      sx={{
        bgcolor: "background.default",
        ".MuiCardHeader-action": {
          mr: searchExpanded ? 0 : undefined,
          flexShrink: searchExpanded ? 1 : undefined,
        },
        overflow: "hidden",
      }}
    >
      {!isMinimized && <Header
        title={searchExpanded ? "" : "Outliner+"}
        action={
          <Stack direction="row" alignItems="center">
            <Tooltip title="Minimize to scene states" disableInteractive>
              <span><IconButton
                aria-label="Minimize to scene states"
                disabled={!hasStateGroups}
                onClick={() => setMode("minimized")}
              >
                <MinimizeIcon />
              </IconButton></span>
            </Tooltip>
            <SearchField
              value={search}
              onChange={setSearch}
              expanded={searchExpanded}
              onExpand={setSearchExpanded}
            />
            <Tooltip title="Settings" disableInteractive>
              <IconButton
                aria-label="Settings"
                aria-pressed={settingsOpen}
                aria-expanded={settingsOpen}
                aria-controls={settingsOpen ? "outliner-settings" : undefined}
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Help" disableInteractive>
              <IconButton
                component="a"
                href={new URL("/", window.location.origin).href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Help"
              >
                <HelpIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />}
      <Box ref={switcherRef} flexShrink={0}><StateSwitcher minimized={isMinimized} onRestore={() => setMode("full")} /></Box>
      {!isMinimized && <SimpleBar style={{ minHeight: 0, flex: 1 }}>
        <List ref={listRef} disablePadding>
          {settingsOpen && <SettingsPanel />}
          <Items search={search} />
        </List>
      </SimpleBar>}
      <ResizeHandles
        dimensions={activeDimensions}
        heightEnabled={!isMinimized}
        onResize={(dimensions) => {
          const mode = isMinimized ? "minimized" : "full";
          updateProfile(mode, dimensions, false);
          void OBR.action.setWidth(dimensions.width);
          if (!isMinimized) void OBR.action.setHeight(dimensions.height);
        }}
        onCommit={(dimensions) => updateProfile(isMinimized ? "minimized" : "full", dimensions, true)}
      />
    </Stack>
  );
}
