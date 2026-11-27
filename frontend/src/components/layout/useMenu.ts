"use client";
// Open and close for the top bar's menus (AppsMenu, ProfileMenu): a click
// on the button toggles; a click outside, Escape or a page change closes.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // A page change closes the menu (adjusting state while rendering, as React recommends over an effect).
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, ref, toggle: () => setOpen((o) => !o), close: () => setOpen(false) };
}
