import { createSvgIcon } from "@mui/material/utils";

const Rays = () => <path
  d="M12 3.2v2.1m5.45-.75-1.2 1.75m4.55 3.05-2.05.65m1.1 5.65-1.95-.65m-.45 4.45-1.25-1.7M12 20.8v-2.1m-5.45.75 1.2-1.75M3.2 14.65l2.05-.65m-1.1-5.65 1.95.65m.45-4.45L7.8 6.3"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
/>;

export const TransparentIcon = createSvgIcon(<Rays />, "Transparent");

export const OpaqueIcon = createSvgIcon(<>
  <Rays />
  <path d="M4.25 19.75 19.75 4.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
</>, "Opaque");
