import AccountTreeIcon from "@mui/icons-material/AccountTreeRounded";
import CallSplitIcon from "@mui/icons-material/CallSplitRounded";
import LinkOffIcon from "@mui/icons-material/LinkOffRounded";
import type { SvgIconProps } from "@mui/material/SvgIcon";

export const InheritanceEnabledIcon = (props: SvgIconProps) => <AccountTreeIcon {...props} />;
export const InheritanceDisabledIcon = (props: SvgIconProps) => <AccountTreeIcon {...props} color="disabled" />;
export const InheritanceBlockedItemIcon = (props: SvgIconProps) => <LinkOffIcon {...props} />;
export const InheritanceBlockedVirtualLayerIcon = (props: SvgIconProps) => <CallSplitIcon {...props} />;
