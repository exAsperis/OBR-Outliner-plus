import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import HelpIcon from "@mui/icons-material/HelpOutlineRounded";
import SettingsIcon from "@mui/icons-material/SettingsRounded";
import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useRef, useState } from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Header } from "./Header";
import { Items } from "./Items";
import { SearchField } from "./SearchField";
import { useOwlbearStore } from "./useOwlbearStore";
import { itemHasPermission } from "./hasPermission";
import { SettingsPanel } from "./SettingsPanel";
import { StateSwitcher } from "./StateSwitcher";

export function Outliner() {
  const listRef = useRef<HTMLUListElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current && ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        const listHeight = Math.max(listRef.current?.getBoundingClientRect().height ?? 0, 64);
        const switcherHeight = switcherRef.current?.getBoundingClientRect().height ?? 0;
        OBR.action.setHeight(listHeight + switcherHeight + 64 + 16);
      });
      resizeObserver.observe(listRef.current);
      if (switcherRef.current) resizeObserver.observe(switcherRef.current);
      return () => {
        resizeObserver.disconnect();
        // Reset height when unmounted
        OBR.action.setHeight(129);
      };
    }
  }, []);

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
      <Header
        title={searchExpanded ? "" : "Outliner+"}
        action={
          <Stack direction="row" alignItems="center">
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
      />
      <Box ref={switcherRef} flexShrink={0}><StateSwitcher /></Box>
      <SimpleBar style={{ minHeight: 0, flex: 1 }}>
        <List ref={listRef} disablePadding>
          {settingsOpen && <SettingsPanel />}
          <Items search={search} />
        </List>
      </SimpleBar>
    </Stack>
  );
}
