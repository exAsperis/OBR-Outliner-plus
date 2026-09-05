import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function OverflowTooltipText({ text, children = text }: { text: string; children?: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setTruncated(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text]);

  return <Tooltip title={truncated ? text : ""} disableInteractive>
    <Box ref={ref} component="span" sx={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {children}
    </Box>
  </Tooltip>;
}
