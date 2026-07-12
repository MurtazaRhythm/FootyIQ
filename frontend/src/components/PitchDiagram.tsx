import type { Diagram } from "@/lib/types";

/** S6 tactical whiteboard: renders Gemini's structured diagram JSON as a
 *  top-down pitch. Coordinates arrive as x 0-100, y 0-65 (attacking
 *  left -> right). Pure SVG — theme-aware via CSS variables. */
export default function PitchDiagram({ diagram }: { diagram: Diagram }) {
  const arrows = diagram.arrows ?? [];

  return (
    <div className="mt-3 rounded-xl border border-border bg-primary/[0.03] p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
        {diagram.title}
      </p>
      <svg
        viewBox="-2 -2 104 69"
        className="w-full"
        role="img"
        aria-label={`Tactical diagram: ${diagram.title}`}
      >
        <defs>
          <marker
            id="pd-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="5"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" fill="rgb(var(--accent, 99 102 241))" />
          </marker>
        </defs>

        {/* pitch markings */}
        <g
          fill="none"
          stroke="rgb(var(--border, 35 35 38))"
          strokeWidth="0.6"
          opacity="0.9"
        >
          <rect x="0" y="0" width="100" height="65" rx="1.5" />
          <line x1="50" y1="0" x2="50" y2="65" />
          <circle cx="50" cy="32.5" r="8.5" />
          {/* left box */}
          <rect x="0" y="13.5" width="15.7" height="38" />
          <rect x="0" y="23.3" width="5.2" height="18.4" />
          {/* right box */}
          <rect x="84.3" y="13.5" width="15.7" height="38" />
          <rect x="94.8" y="23.3" width="5.2" height="18.4" />
        </g>

        {/* arrows under the players */}
        {arrows.map((a, i) => (
          <line
            key={i}
            x1={a.fromX}
            y1={a.fromY}
            x2={a.toX}
            y2={a.toY}
            stroke="rgb(var(--accent, 99 102 241))"
            strokeWidth="0.9"
            strokeDasharray={a.style === "pass" ? "2 1.5" : undefined}
            markerEnd="url(#pd-arrowhead)"
            opacity="0.85"
            className="pd-arrow"
            style={{ animationDelay: `${0.5 + i * 0.15}s` }}
          />
        ))}

        {/* players */}
        {diagram.players.map((p, i) => (
          <g
            key={i}
            className="pd-dot"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r="2.6"
              fill={p.team === "attack" ? "rgb(var(--accent, 99 102 241))" : "#ef4444"}
              stroke="rgb(var(--bg, 10 10 11))"
              strokeWidth="0.5"
            />
            {p.label && (
              <text
                x={p.x}
                y={p.y + 5.4}
                textAnchor="middle"
                fontSize="2.8"
                fill="rgb(var(--muted, 139 139 147))"
                fontFamily="inherit"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
