import CssBaseline from "@mui/material/CssBaseline";
import React from "react";
import ReactDOM from "react-dom/client";
import { PluginGate } from "./PluginGate";
import { PluginThemeProvider } from "./PluginThemeProvider";
import { SendMenuApp } from "./SendMenuApp";
import "./sendMenu.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PluginGate>
      <PluginThemeProvider>
        <CssBaseline />
        <SendMenuApp />
      </PluginThemeProvider>
    </PluginGate>
  </React.StrictMode>,
);
