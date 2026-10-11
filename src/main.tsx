import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./print.css";
import { theme } from "./theme";
import App from "./App";
import { Autosave } from "./components/Autosave";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <ModalsProvider>
        <Notifications position="top-center" />
        <App />
        <Autosave />
      </ModalsProvider>
    </MantineProvider>
  </StrictMode>,
);
