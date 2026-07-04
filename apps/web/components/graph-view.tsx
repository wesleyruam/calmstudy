"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GraphData } from "@/lib/concept-shared";

interface Pos {
  x: number;
  y: number;
}

// Layout força-dirigido (Fruchterman-Reingold enxuto), determinístico.
function layout(data: GraphData): Map<string, Pos> {
  const n = data.nodes.length;
  const pos = new Map<string, Pos>();
  if (n === 0) return pos;

  const W = 1000;
  const H = 700;
  const area = W * H;
  const k = Math.sqrt(area / n); // distância ideal
  // seed determinístico em círculo
  data.nodes.forEach((node, i) => {
    const a = (i / n) * Math.PI * 2;
    pos.set(node.id, { x: W / 2 + Math.cos(a) * 200, y: H / 2 + Math.sin(a) * 200 });
  });

  const ids = data.nodes.map((n) => n.id);
  let temp = W / 10;
  const iterations = 300;
  for (let it = 0; it < iterations; it++) {
    const disp = new Map<string, Pos>(ids.map((id) => [id, { x: 0, y: 0 }]));
    // repulsão entre todos os pares
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = pos.get(ids[i]!)!;
        const b = pos.get(ids[j]!)!;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.hypot(dx, dy) || 0.01;
        const force = (k * k) / dist;
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;
        const di = disp.get(ids[i]!)!;
        const dj = disp.get(ids[j]!)!;
        di.x += dx;
        di.y += dy;
        dj.x -= dx;
        dj.y -= dy;
      }
    }
    // atração pelas arestas
    for (const e of data.edges) {
      const a = pos.get(e.from);
      const b = pos.get(e.to);
      if (!a || !b) continue;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist * dist) / k;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      const da = disp.get(e.from)!;
      const db = disp.get(e.to)!;
      da.x -= dx;
      da.y -= dy;
      db.x += dx;
      db.y += dy;
    }
    // aplica com limite de temperatura
    for (const id of ids) {
      const d = disp.get(id)!;
      const p = pos.get(id)!;
      const len = Math.hypot(d.x, d.y) || 0.01;
      p.x += (d.x / len) * Math.min(len, temp);
      p.y += (d.y / len) * Math.min(len, temp);
    }
    temp *= 0.97;
  }
  return pos;
}

export function GraphView({ data }: { data: GraphData }) {
  const router = useRouter();

  const { pos, view } = useMemo(() => {
    const pos = layout(data);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of pos.values()) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const pad = 80;
    const view =
      pos.size === 0
        ? "0 0 1000 700"
        : `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
    return { pos, view };
  }, [data]);

  const radius = (degree: number) => 8 + Math.min(degree, 8) * 2.5;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <Link
            href="/conhecimento"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
          >
            <ArrowLeft className="size-4" /> Conhecimento
          </Link>
          <h1 className="mt-3 font-serif text-2xl">Mapa de conhecimento</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
            Como seus conceitos se conectam.
          </p>
        </div>
      </header>

      {data.nodes.length === 0 ? (
        <p className="mt-16 text-center text-sm text-[var(--color-ink-soft)]">
          Crie conceitos e ligações para ver o mapa.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
          <svg viewBox={view} className="h-[70vh] w-full" role="img" aria-label="Mapa de conceitos">
            {data.edges.map((e, i) => {
              const a = pos.get(e.from);
              const b = pos.get(e.to);
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--color-line)"
                  strokeWidth={1.5}
                />
              );
            })}
            {data.nodes.map((node) => {
              const p = pos.get(node.id);
              if (!p) return null;
              const r = radius(node.degree);
              return (
                <g
                  key={node.id}
                  transform={`translate(${p.x} ${p.y})`}
                  className="cursor-pointer"
                  onClick={() => router.push(`/conceito/${node.id}`)}
                >
                  <circle
                    r={r}
                    fill={node.color ?? "var(--color-accent)"}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  />
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    className="fill-[var(--color-ink)] text-[13px]"
                    style={{ paintOrder: "stroke", stroke: "var(--color-surface)", strokeWidth: 3 }}
                  >
                    {node.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
