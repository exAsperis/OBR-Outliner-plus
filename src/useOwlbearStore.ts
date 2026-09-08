import { Item, Permission, Player } from "@owlbear-rodeo/sdk";
import { create } from "zustand";
import { EMPTY_VIRTUAL_LAYER_STATE, type VirtualLayerState } from "./virtualLayers";
import { DEFAULT_SCENE_MINIMIZED_LAYOUT, type SceneMinimizedLayout } from "./sceneMinimizedLayout";

interface OwlbearState {
  sceneReady: boolean;
  items: Item[];
  role: Player["role"];
  selection: Player["selection"];
  permissions: Permission[];
  virtualLayers: VirtualLayerState;
  virtualLayersReady: boolean;
  sceneMinimizedLayout: SceneMinimizedLayout;

  setSceneReady: (ready: boolean) => void;
  setItems: (items: Item[]) => void;
  setRole: (role: Player["role"]) => void;
  setSelection: (selection: Player["selection"]) => void;
  setPermissions: (permissions: Permission[]) => void;
  setVirtualLayers: (virtualLayers: VirtualLayerState, ready?: boolean) => void;
  setSceneMinimizedLayout: (sceneMinimizedLayout: SceneMinimizedLayout) => void;
}

export const useOwlbearStore = create<OwlbearState>()((set) => ({
  items: [],
  role: "PLAYER",
  sceneReady: false,
  selection: undefined,
  permissions: [],
  virtualLayers: EMPTY_VIRTUAL_LAYER_STATE,
  virtualLayersReady: false,
  sceneMinimizedLayout: DEFAULT_SCENE_MINIMIZED_LAYOUT,

  setSceneReady: (sceneReady) => set((state) => ({ ...state, sceneReady })),
  setItems: (items) => set((state) => ({ ...state, items })),
  setRole: (role) => set((state) => ({ ...state, role })),
  setSelection: (selection) => set((state) => ({ ...state, selection })),
  setPermissions: (permissions) => set((state) => ({ ...state, permissions })),
  setVirtualLayers: (virtualLayers, virtualLayersReady = true) => set((state) => ({ ...state, virtualLayers, virtualLayersReady })),
  setSceneMinimizedLayout: (sceneMinimizedLayout) => set((state) => ({ ...state, sceneMinimizedLayout })),
}));
