import OBR, { Player } from "@owlbear-rodeo/sdk";
import { useOwlbearStore } from "./useOwlbearStore";
import { useEffect, useState } from "react";
import { stateFromMetadata, EMPTY_VIRTUAL_LAYER_STATE } from "./virtualLayers";

// Sync OBR with the apps Zustand store
export function useOwlbearStoreSync() {
  const [roleReady, setRoleReady] = useState(false);
  const role = useOwlbearStore((state) => state.role);
  const setRole = useOwlbearStore((state) => state.setRole);
  const setSelection = useOwlbearStore((state) => state.setSelection);
  useEffect(() => {
    const handlePlayerChange = (player: Player) => {
      setRole(player.role);
      setSelection(player.selection);
      setRoleReady(true);
    };
    OBR.player.getRole().then((nextRole) => {
      setRole(nextRole);
      setRoleReady(true);
    });
    return OBR.player.onChange(handlePlayerChange);
  }, [setRole, setSelection]);

  const isGameMaster = roleReady && role === "GM";
  useEffect(() => {
    if (isGameMaster) OBR.player.getSelection().then(setSelection);
    else setSelection(undefined);
  }, [isGameMaster, setSelection]);

  const setSceneReady = useOwlbearStore((state) => state.setSceneReady);
  useEffect(() => {
    if (!isGameMaster) {
      setSceneReady(false);
      return;
    }
    OBR.scene.isReady().then(setSceneReady);
    return OBR.scene.onReadyChange(setSceneReady);
  }, [isGameMaster, setSceneReady]);

  const sceneReady = useOwlbearStore((state) => state.sceneReady);
  const setItems = useOwlbearStore((state) => state.setItems);
  useEffect(() => {
    if (isGameMaster && sceneReady) {
      OBR.scene.items.getItems().then(setItems);
      return OBR.scene.items.onChange(setItems);
    } else {
      setItems([]);
    }
  }, [isGameMaster, sceneReady, setItems]);

  const setVirtualLayers = useOwlbearStore((state) => state.setVirtualLayers);
  useEffect(() => {
    if (!isGameMaster || !sceneReady) { setVirtualLayers(EMPTY_VIRTUAL_LAYER_STATE); return; }
    OBR.scene.getMetadata().then((metadata) => setVirtualLayers(stateFromMetadata(metadata)));
    return OBR.scene.onMetadataChange((metadata) => setVirtualLayers(stateFromMetadata(metadata)));
  }, [isGameMaster, sceneReady, setVirtualLayers]);

  const setPermissions = useOwlbearStore((state) => state.setPermissions);
  useEffect(() => {
    if (!isGameMaster) {
      setPermissions([]);
      return;
    }
    OBR.room.getPermissions().then(setPermissions);
    return OBR.room.onPermissionsChange(setPermissions);
  }, [isGameMaster, setPermissions]);

  return roleReady;
}
