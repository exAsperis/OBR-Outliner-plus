import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { InheritanceVisualState } from "./stateInheritance";
import {
  InheritanceBlockedItemIcon,
  InheritanceBlockedVirtualLayerIcon,
  InheritanceDisabledIcon,
  InheritanceEnabledIcon,
} from "./icons/other/InheritanceIcons";

export function InheritanceStateIcon({ state, ...props }: SvgIconProps & { state: InheritanceVisualState }) {
  const Icon = state === "blocked-item" ? InheritanceBlockedItemIcon
    : state === "blocked-virtual-layer" ? InheritanceBlockedVirtualLayerIcon
      : state === "enabled" ? InheritanceEnabledIcon : InheritanceDisabledIcon;
  return <Icon {...props} />;
}
