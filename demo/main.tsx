import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureSanitizer } from "streamhtml";
import "katex/dist/katex.min.css";
import App from "./App";
import "../styles.css";

configureSanitizer({
  ADD_ATTR: [
    "target",
    "data-latex",
    "data-display",
    "open",
    "data-stream-action",
  ],
  FORBID_TAGS: ["script", "iframe", "object", "embed"],
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
