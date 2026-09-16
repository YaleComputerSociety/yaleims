"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks the rendered height of an element, kept current through resizes.
 *
 * Used to centre bracket content on the viewport's midpoint rather than the
 * midpoint of the space left below the page header: padding the centring
 * container by the header's height shrinks its content box at the bottom by the
 * same amount the header takes at the top, so the centre lands back on the
 * middle of the screen.
 */
export function useElementHeight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [height, setHeight] = useState(0);

  const measure = useCallback(() => {
    const node = ref.current;
    if (node) setHeight(node.getBoundingClientRect().height);
  }, []);

  useEffect(() => {
    measure();

    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(node);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return { ref, height };
}

export default useElementHeight;
