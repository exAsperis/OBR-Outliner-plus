import CssBaseline from "@mui/material/CssBaseline";
import React from "react";
import ReactDOM from "react-dom/client";
import { PluginGate } from "./PluginGate";
import { PluginThemeProvider } from "./PluginThemeProvider";
import { SendToLayerApp } from "./SendToLayerApp";
import "./sendToLayer.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PluginGate>
      <PluginThemeProvider>
        <CssBaseline />
        <SendToLayerApp />
      </PluginThemeProvider>
    </PluginGate>
  </React.StrictMode>,
);
