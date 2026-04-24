import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Dot } from "@/components/ui/Dot";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="mx-auto max-w-[1200px] px-8 py-12 flex flex-col gap-10">
      <header className="flex items-center gap-3">
        <Logo size={36} />
        <span className="text-[17px] font-medium tracking-[-0.02em]">Soter Walkthrough</span>
        <span className="ml-auto text-xs text-ink-3 font-mono uppercase tracking-[0.1em]">
          Design tokens
        </span>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 font-mono">
          Typography
        </h2>
        <Card className="flex flex-col gap-3">
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] font-mono text-ink-4 min-w-[80px]">20 / 500</span>
            <span className="text-xl font-medium tracking-[-0.02em]">Production Floor</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] font-mono text-ink-4 min-w-[80px]">14 / 500</span>
            <span className="text-sm font-medium">Monroe Plant A</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] font-mono text-ink-4 min-w-[80px]">12 / 400</span>
            <span className="text-xs text-ink-2">12 waypoints · Last walk 2 days ago</span>
          </div>
          <div className="flex items-baseline gap-4">
            <span className="text-[10px] font-mono text-ink-4 min-w-[80px]">Mono 11</span>
            <span className="text-[11px] font-mono text-ink-3">3 of 12 · 10:42 AM</span>
          </div>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 font-mono">
          Color
        </h2>
        <Card className="flex gap-6 items-center flex-wrap">
          {[
            { color: "#0f0f0f", label: "ink" },
            { color: "#fafaf8", label: "surface", border: true },
            { color: "#2610ff", label: "accent" },
            { color: "#00875a", label: "success" },
            { color: "#ff6b2b", label: "active" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1.5">
              <div
                className="w-10 h-10 rounded-[10px] shadow-sm"
                style={{
                  background: s.color,
                  border: s.border ? "1px solid var(--surface-3)" : undefined,
                }}
              />
              <span className="text-[10px] font-mono text-ink-3">{s.label}</span>
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-3 font-mono">
          Primitives
        </h2>
        <Card className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary">Save path</Button>
            <Button variant="accent">Walk</Button>
            <Button variant="ghost">Edit</Button>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <Badge tone="blue" dot>Active</Badge>
            <Badge tone="green" dot>Completed</Badge>
            <Badge tone="warm" dot>In progress</Badge>
            <Badge tone="neutral">12 waypoints</Badge>
          </div>
          <div className="relative h-24 bg-surface-2 rounded-[var(--radius-md)]">
            <Dot state="default" label="1" style={{ left: "15%", top: "50%" }} />
            <Dot state="active" label="2" style={{ left: "35%", top: "50%" }} />
            <Dot state="completed" label="3" style={{ left: "55%", top: "50%" }} />
            <Dot state="has-photos" style={{ left: "75%", top: "50%" }} />
            <Dot state="no-photos" style={{ left: "90%", top: "50%" }} />
          </div>
          <div className="max-w-sm">
            <Button variant="capture">Take Photo</Button>
          </div>
        </Card>
      </section>
    </main>
  );
}
