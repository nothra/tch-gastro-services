import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE_SELECTOR = "a[href], button:not([disabled])";

type UseNavDrawerFocusResult = {
  open: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
  drawerRef: React.RefObject<HTMLDivElement | null>;
};

// Fokus-Management für den mobilen Off-Canvas-Drawer (ADR-031): Escape schließt, Tab wird im
// Drawer gefangen (aria-modal="true" verlangt Fokus-Containment, WAI-ARIA APG), und der Fokus
// kehrt beim Schließen auf den Auslöser zurück.
export function useNavDrawerFocus(): UseNavDrawerFocusResult {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  // openDrawer/closeDrawer setzen nur State (kein Ref-Zugriff im Render-Pfad); das
  // Fokus-Management erledigen die Effekte unten – so bleiben beide mockfrei als
  // onClick weiterreichbar.
  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const focusable = drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      // Der Drawer-Container selbst (tabIndex=-1) zählt beim Rückwärts-Tab als "vor dem ersten".
      if (event.shiftKey && (active === first || active === drawer)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (!drawer.contains(active)) {
        // Fokus ist aus dem Drawer entwichen → zurück auf das erste Element.
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeDrawer]);

  // Fokus folgt dem sichtbaren Bereich (A11y): beim Öffnen in den Drawer, beim Schließen
  // zurück auf den Auslöser – Letzteres nur, wenn der Drawer zuvor wirklich offen war.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      drawerRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      toggleRef.current?.focus();
    }
  }, [open]);

  return { open, openDrawer, closeDrawer, toggleRef, drawerRef };
}
