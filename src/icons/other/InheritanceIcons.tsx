import { createSvgIcon } from "@mui/material/utils";

const ObrLayer = ({ filled = false }: { filled?: boolean }) => <rect x="3.36" y="3.36" width="5.1" height="5.1" rx="0.85" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" />;
const VirtualLayer = ({ filled = false }: { filled?: boolean }) => <rect x="9.28" y="9.16" width="5.84" height="5.84" rx="0.97" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1" />;
const Item = ({ filled = false }: { filled?: boolean }) => <circle cx="18.12" cy="18.12" r="2.54" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.72" />;
const FirstLink = () => <path d="M5.94 9.3v2.67h2.84" fill="none" stroke="currentColor" strokeWidth="0.75" />;
const SecondLink = () => <path d="M12.07 15.44v2.68h2.84" fill="none" stroke="currentColor" strokeWidth="0.75" />;

export const InheritanceDisabledIcon = createSvgIcon(<>
  <ObrLayer /><VirtualLayer /><Item /><FirstLink /><SecondLink />
  <path d="M3.54 20.42 20.4 3.56" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
</>, "InheritanceDisabled");

export const InheritanceEnabledIcon = createSvgIcon(<>
  <ObrLayer filled /><VirtualLayer filled /><Item filled /><FirstLink /><SecondLink />
</>, "InheritanceEnabled");

export const InheritanceBlockedItemIcon = createSvgIcon(<>
  <ObrLayer filled /><VirtualLayer filled /><Item /><FirstLink />
  <path d="m11.53 19.22 7.67-7.66" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
</>, "InheritanceBlockedItem");

export const InheritanceBlockedVirtualLayerIcon = createSvgIcon(<>
  <ObrLayer filled /><VirtualLayer /><Item filled /><SecondLink />
  <path d="M5.17 13.04 12.84 5.37" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
</>, "InheritanceBlockedVirtualLayer");
