import { useEffect, useState } from "react";
import { useDebouncedCallback } from "@mantine/hooks";

/**
 * Keeps a form field's value locally while typing and only commits it to the store once the
 * user pauses (or leaves the field), so each keystroke doesn't update the project, redraw the
 * image and trigger saving. Outside changes (undo, cloud pull) are adopted when nothing is pending.
 * Give the component a `key` per record so a pending commit never lands on the wrong one.
 */
export function useDebouncedField<T>(value: T, commit: (v: T) => void, delay = 500) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedCallback(commit, { delay, flushOnUnmount: true });
  useEffect(() => { if (!debounced.isPending()) setDraft(value); }, [value]);
  return {
    value: draft,
    onChange: (v: T) => { setDraft(v); debounced(v); },
    onBlur: () => debounced.flush(),
  };
}
