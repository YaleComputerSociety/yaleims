"use client";
// Opens a game's scoresheet PDF in a new tab, ready to print. The PDF
// renderer is loaded on the first click, never during server rendering.
import { useState } from "react";
import { FaPrint } from "react-icons/fa";
import { toast } from "react-toastify";
import { scoresheetFileName } from "./fileName";
import type { Game } from "./types";

interface PrintButtonProps {
  /** The game, or how to read it when clicked (so the sheet has the roster as it is then). */
  game: Game | (() => Promise<Game>);
  label?: string;
  className?: string;
}

export default function PrintButton({
  game,
  label = "Print scoresheet",
  className = "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-50",
}: PrintButtonProps) {
  const [busy, setBusy] = useState(false);

  const print = async () => {
    // Opened before any await: browsers block pop-ups not opened directly by the click.
    const tab = window.open("", "_blank");
    setBusy(true);
    try {
      const [{ pdf }, { default: ScoresheetPDF }, data] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ScoresheetPDF"),
        typeof game === "function" ? game() : game,
      ]);
      const logo = new URL("/LOGO.png", window.location.origin).href;
      const blob = await pdf(<ScoresheetPDF game={data} logo={logo} />).toBlob();
      const url = URL.createObjectURL(new File([blob], scoresheetFileName(data), { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      toast.error(`Couldn't make the scoresheet: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={print} disabled={busy} className={className}>
      <FaPrint />
      {busy ? "Generating…" : label}
    </button>
  );
}
