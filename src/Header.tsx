import React from "react";

import Box from "@mui/material/Box";
import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EXTENSION_VERSION } from "./version";

export function Header({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <>
      <CardHeader
        avatar={
          <Box role="img" aria-label="Outliner+ icon" sx={{ width: 40, height: 40, bgcolor: "primary.main", mask: "url(/icon.svg) center / contain no-repeat", WebkitMask: "url(/icon.svg) center / contain no-repeat" }} />
        }
        title={
          title && (
            <Stack direction="row" alignItems="baseline" spacing={0.75}>
              <span>{title}</span>
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 400, lineHeight: 1 }}
              >
                v{EXTENSION_VERSION}
              </Typography>
            </Stack>
          )
        }
        action={action}
        sx={{ height: 64, boxSizing: "border-box", py: 1.5 }}
        titleTypographyProps={{
          sx: {
            fontSize: "1.125rem",
            fontWeight: "bold",
            lineHeight: "32px",
            color: "text.primary",
          },
        }}
      />
      <Divider variant={subtitle ? "middle" : "fullWidth"} />
      {subtitle && (
        <Typography
          variant="caption"
          sx={{
            px: 2,
            py: 1,
            display: "inline-block",
            color: "text.secondary",
          }}
        >
          {subtitle}
        </Typography>
      )}
    </>
  );
}
