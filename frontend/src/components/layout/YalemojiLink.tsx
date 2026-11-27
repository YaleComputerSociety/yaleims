"use client";
// Every link to Yalemoji goes through here: it opens in a new tab, tells
// Yalemoji where the person came from (ref=yaleims) and which theme to
// draw in (mode=light|dark), and marks the visit, so the account button
// asks for the avatar again when the person comes back (lib/yalemojiCache.ts).
import { useTheme } from "next-themes";
import type { ComponentProps } from "react";
import { markYalemojiVisit } from "@/lib/yalemojiCache";

const PAGES = {
  /** Yalemoji's front page (the apps menu). */
  home: "/",
  /** Edit the avatar they have. */
  editor: "/editor",
  /** Make a first one. */
  create: "/create",
} as const;

export function yalemojiUrl(page: keyof typeof PAGES, mode: "light" | "dark"): string {
  const url = new URL(PAGES[page], "https://www.yalemoji.com"); // www: the apex redirects
  url.searchParams.set("ref", "yaleims");
  url.searchParams.set("mode", mode);
  return url.href;
}

type Props = Omit<ComponentProps<"a">, "href" | "target" | "rel"> & { page: keyof typeof PAGES };

/**
 * Rendered only after mount (inside menus that open on a click), so the
 * theme is the browser's; before next-themes knows it, light.
 */
export default function YalemojiLink({ page, onClick, onAuxClick, ...props }: Props) {
  const { resolvedTheme } = useTheme();
  return (
    <a
      {...props}
      href={yalemojiUrl(page, resolvedTheme === "dark" ? "dark" : "light")}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        onClick?.(event);
        markYalemojiVisit();
      }}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (event.button === 1) markYalemojiVisit(); // middle click: a new tab too
      }}
    />
  );
}
