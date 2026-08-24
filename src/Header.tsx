import React from "react";

import CardHeader from "@mui/material/CardHeader";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

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
        title={title}
        action={action}
        sx={{ bgcolor: "background.paper" }}
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
