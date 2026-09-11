import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export function OverflowTooltipText({ text, children = text, detail }: { text: string; children?: ReactNode; detail?: ReactNode }) {
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

  const title = detail === undefined
    ? truncated ? text : ""
    : <Box><Box>{text}</Box><Box sx={{ color: "text.secondary", fontSize: "0.75rem" }}>{detail}</Box></Box>;
  return <Tooltip title={title} disableInteractive>
    <Box ref={ref} component="span" sx={{ display: "block", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</Box>
  </Tooltip>;
}
