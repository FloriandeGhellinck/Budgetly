import type { MouseEvent } from "react";

// A click the page may handle itself: the main button, no modifier. A
// modified click (new tab, new window) is left to the link's href.
export function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
