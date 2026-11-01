"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Connector lines between bracket cells, measured from the rendered DOM rather
 * than positioned with fixed coordinates, so the same code serves layouts that
 * differ (the tournament bracket adds a third place game below the final) and
 * survives resizes and sidebar toggles.
 */
export type BracketEdge = { from: number; to: number; kind: "winner" | "loser" };

/** The 14-team bracket shape shared by playoff brackets and tournaments. */
export const WINNER_EDGES: BracketEdge[] = [
  { from: 1, to: 5, kind: "winner" },
  { from: 2, to: 5, kind: "winner" },
  { from: 3, to: 6, kind: "winner" },
  { from: 4, to: 6, kind: "winner" },
  { from: 5, to: 13, kind: "winner" },
  { from: 6, to: 13, kind: "winner" },
  { from: 7, to: 11, kind: "winner" },
  { from: 8, to: 11, kind: "winner" },
  { from: 9, to: 12, kind: "winner" },
  { from: 10, to: 12, kind: "winner" },
  { from: 11, to: 14, kind: "winner" },
  { from: 12, to: 14, kind: "winner" },
  { from: 13, to: 15, kind: "winner" },
  { from: 14, to: 15, kind: "winner" },
];

/** Tournaments add the two semifinal losers dropping into the third place game. */
export const TOURNAMENT_EDGES: BracketEdge[] = [
  ...WINNER_EDGES,
  { from: 13, to: 16, kind: "loser" },
  { from: 14, to: 16, kind: "loser" },
];

export const edgeKey = (edge: BracketEdge) =>
  `${edge.from}-${edge.to}-${edge.kind}`;

export interface Connector {
  key: string;
  d: string;
  kind: "winner" | "loser";
}

interface SlotMatch {
  bracket_placement: number;
  match_id: string | number;
}

export function useBracketConnectors(edges: BracketEdge[], enabled: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [canvas, setCanvas] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const setCellRef = useCallback(
    (slot: number) => (node: HTMLDivElement | null) => {
      cellRefs.current[slot] = node;
    },
    []
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const base = container.getBoundingClientRect();
    if (base.width === 0 || base.height === 0) return;

    const rectFor = (slot: number) => {
      const node = cellRefs.current[slot];
      if (!node) return null;
      const r = node.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return {
        left: r.left - base.left,
        right: r.right - base.left,
        centerX: r.left + r.width / 2 - base.left,
        centerY: r.top + r.height / 2 - base.top,
      };
    };

    const next: Connector[] = [];
    for (const edge of edges) {
      const from = rectFor(edge.from);
      const to = rectFor(edge.to);
      if (!from || !to) continue;

      // Left-hand cells feed rightwards and vice versa, so anchor each end to
      // the side that actually faces its partner.
      const goingRight = from.centerX < to.centerX;
      const sx = goingRight ? from.right : from.left;
      const tx = goingRight ? to.left : to.right;
      const mx = (sx + tx) / 2;

      next.push({
        key: edgeKey(edge),
        kind: edge.kind,
        d: `M ${sx} ${from.centerY} H ${mx} V ${to.centerY} H ${tx}`,
      });
    }

    setCanvas({ w: base.width, h: base.height });
    setConnectors(next);
  }, [edges]);

  useEffect(() => {
    if (!enabled) {
      setConnectors([]);
      return;
    }

    measure();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, measure]);

  return { containerRef, setCellRef, connectors, canvas, remeasure: measure };
}

/**
 * Maps each college to the edges it actually travelled, so hovering lights up
 * only the real path. An edge counts once its source match has a winner and
 * that team appears in the destination match.
 */
export function buildTeamConnections(
  edges: BracketEdge[],
  slots: SlotMatch[] | null,
  matchDetails: Record<string, any>
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  if (!slots) return map;

  const bySlot = new Map(slots.map((m) => [m.bracket_placement, m]));

  for (const edge of edges) {
    const fromSlot = bySlot.get(edge.from);
    const toSlot = bySlot.get(edge.to);
    if (!fromSlot || !toSlot) continue;

    const fromData = matchDetails[fromSlot.match_id as any];
    const toData = matchDetails[toSlot.match_id as any];
    if (!fromData || !toData || !fromData.winner) continue;

    const team =
      edge.kind === "winner"
        ? fromData.winner
        : fromData.winner === fromData.home_college
        ? fromData.away_college
        : fromData.home_college;

    if (!team || team === "TBD" || team === "Draw" || team === "Default") {
      continue;
    }
    if (toData.home_college !== team && toData.away_college !== team) continue;

    if (!map[team]) map[team] = [];
    map[team].push(edgeKey(edge));
  }

  return map;
}

interface BracketConnectorSvgProps {
  connectors: Connector[];
  canvas: { w: number; h: number };
  activeEdges: Set<string>;
}

const BracketConnectorSvg: React.FC<BracketConnectorSvgProps> = ({
  connectors,
  canvas,
  activeEdges,
}) => {
  // Sibling edges into the same parent share their final stub, so a highlighted
  // path would be painted over by its unhighlighted sibling. Drawing the active
  // ones last keeps the whole highlighted route visible.
  const ordered = useMemo(() => {
    const inactive = connectors.filter((c) => !activeEdges.has(c.key));
    const active = connectors.filter((c) => activeEdges.has(c.key));
    return [...inactive, ...active];
  }, [connectors, activeEdges]);

  if (canvas.w === 0 || connectors.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 w-full h-full text-yellow-500 pointer-events-none"
      xmlns="http://www.w3.org/2000/svg"
      width={canvas.w}
      height={canvas.h}
      viewBox={`0 0 ${canvas.w} ${canvas.h}`}
      fill="none"
    >
      {ordered.map((connector) => {
        const active = activeEdges.has(connector.key);
        const isLoser = connector.kind === "loser";
        return (
          <path
            key={connector.key}
            d={connector.d}
            className={`glow-line ${active ? "active" : ""}`}
            stroke={active ? "#00FFFF" : isLoser ? "#f59e0b" : "currentColor"}
            strokeWidth={active ? 3.5 : 2.5}
            strokeOpacity={active ? 1 : isLoser ? 0.5 : 0.65}
            strokeDasharray={isLoser ? "6 5" : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
};

export default BracketConnectorSvg;
