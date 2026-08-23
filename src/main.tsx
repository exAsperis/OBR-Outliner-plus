import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App";
import "./index.css";
import { PluginGate } from "./PluginGate";
import { PluginThemeProvider } from "./PluginThemeProvider";
import CssBaseline from "@mui/material/CssBaseline";
import { GlobalStyles } from "./GlobalStyles";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <PluginGate>
      <PluginThemeProvider>
        <CssBaseline />
        <GlobalStyles />
        <App />
      </PluginThemeProvider>
    </PluginGate>
  </React.StrictMode>
);
