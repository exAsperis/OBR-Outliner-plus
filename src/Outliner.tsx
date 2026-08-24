import List from "@mui/material/List";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
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

export function Outliner() {
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (listRef.current && ResizeObserver) {
      const resizeObserver = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          const entry = entries[0];
          // Get the height of the border box
          // In the future you can use `entry.borderBoxSize`
          // however as of this time the property isn't widely supported (iOS)
          const borderHeight = entry.contentRect.bottom + entry.contentRect.top;
          // Set a minimum height of 64px
          const listHeight = Math.max(borderHeight, 64);
          // Set the action height to the list height + the card header height + padding
          OBR.action.setHeight(listHeight + 64 + 16);
        }
      });
      resizeObserver.observe(listRef.current);
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
      <SimpleBar style={{ maxHeight: "calc(100vh - 64px)" }}>
        <List ref={listRef} disablePadding>
          {settingsOpen && <SettingsPanel />}
          <Items search={search} />
        </List>
      </SimpleBar>
    </Stack>
  );
}
