import { useEffect } from "react";
import { useDebouncedCallback, useDocumentVisibility, useWindowEvent } from "@mantine/hooks";
import { useStore, flushSave } from "../store";

const IDLE_MS = 800;
const pending = () => useStore.getState().saveState === "pending";

/** Saves to localStorage once the user pauses, or straight away when the tab loses focus, is hidden or closes. */
export function Autosave() {
  const project = useStore((s) => s.project);
  const save = useDebouncedCallback(() => { if (pending()) flushSave(); }, { delay: IDLE_MS, flushOnUnmount: true });
  useEffect(() => { if (pending()) save(); }, [project]);
  const flushNow = () => { save.cancel(); if (pending()) flushSave(); };
  useWindowEvent("blur", flushNow);
  useWindowEvent("pagehide", flushNow);
  useWindowEvent("beforeunload", flushNow);
  const visibility = useDocumentVisibility();
  useEffect(() => { if (visibility === "hidden") flushNow(); }, [visibility]);
  return null;
}
