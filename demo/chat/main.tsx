import { createRoot } from "react-dom/client";
import { configureSanitizer } from "streamhtml";
import "../../styles.css";
import { ChatApp } from "./App";
import "./chat.css";

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

createRoot(document.getElementById("root")!).render(<ChatApp />);
