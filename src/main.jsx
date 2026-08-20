import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../portal-vesto.jsx";
import { initStorage } from "./lib/storage.js";

const root = createRoot(document.getElementById("root"));

initStorage().finally(() => {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
