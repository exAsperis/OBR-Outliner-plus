import type { StackOperation } from "./stacking";

export const SEND_ACTIONS: ReadonlyArray<{ operation: StackOperation; label: string }> = [
  { operation: "front", label: "to Front" },
  { operation: "forward", label: "Forward" },
  { operation: "backward", label: "Backward" },
  { operation: "back", label: "to Back" },
];

export type SendMenuView = "actions" | "layers";
export type SendMenuNavigation = "open-layers" | "back";

export function navigateSendMenu(view: SendMenuView, navigation: SendMenuNavigation): SendMenuView {
  if (navigation === "open-layers") return "layers";
  return view === "layers" ? "actions" : view;
}
