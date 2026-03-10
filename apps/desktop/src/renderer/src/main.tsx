import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DesktopOnlyFallback } from "./components/DesktopOnlyFallback";
import "./styles.css";

const hasDesktopApi = typeof window !== "undefined" && typeof window.desktopApi !== "undefined";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {hasDesktopApi ? <App /> : <DesktopOnlyFallback />}
  </React.StrictMode>
);
