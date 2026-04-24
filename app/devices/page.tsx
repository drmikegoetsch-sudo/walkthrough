import Link from "next/link";
import {
  ArrowLeft,
  Battery,
  Bluetooth,
  Camera,
  Glasses,
  MoreHorizontal,
  Plus,
  Signal,
  Smartphone,
  Video,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

type DeviceIcon = typeof Smartphone;

type PairedDevice = {
  id: string;
  name: string;
  model: string;
  icon: DeviceIcon;
  status: "connected" | "offline";
  lastSync: string;
  battery?: number;
  signal?: "strong" | "medium" | "weak";
  isDefault?: boolean;
};

type AvailableDevice = {
  id: string;
  name: string;
  description: string;
  icon: DeviceIcon;
  status: "ready" | "requires-app";
};

const paired: PairedDevice[] = [
  {
    id: "iphone-mike",
    name: "Mike's iPhone",
    model: "iPhone 15 Pro · iOS 18.2",
    icon: Smartphone,
    status: "connected",
    lastSync: "Just now",
    battery: 87,
    signal: "strong",
    isDefault: true,
  },
  {
    id: "soter-vision-01",
    name: "Soter Vision",
    model: "Smart glasses · Firmware 2.4.1",
    icon: Glasses,
    status: "connected",
    lastSync: "Syncing photos",
    battery: 62,
    signal: "medium",
  },
  {
    id: "bodycam-01",
    name: "Axon Body 4",
    model: "Body-worn camera",
    icon: Video,
    status: "offline",
    lastSync: "Last seen 2 days ago",
  },
];

const available: AvailableDevice[] = [
  {
    id: "ray-ban-meta",
    name: "Ray-Ban Meta",
    description: "Smart glasses · POV photo capture",
    icon: Glasses,
    status: "ready",
  },
  {
    id: "vuzix-blade-2",
    name: "Vuzix Blade 2",
    description: "AR glasses · Hands-free review",
    icon: Glasses,
    status: "requires-app",
  },
  {
    id: "insta360",
    name: "Insta360 X4",
    description: "360° camera · Immersive capture",
    icon: Camera,
    status: "ready",
  },
];

export default function DevicesPage() {
  return (
    <main className="mx-auto max-w-[1000px] px-8 py-10">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/dashboard"
          className="w-8 h-8 border border-surface-3 rounded-[var(--radius-sm)] flex items-center justify-center text-ink-3 hover:text-ink-2 hover:border-ink-4 transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={14} />
        </Link>
        <div className="flex-1">
          <div className="text-[20px] font-semibold tracking-[-0.02em]">
            Devices
          </div>
          <div className="text-xs text-ink-3 mt-0.5">
            Manage paired capture devices and your default capture source.
          </div>
        </div>
      </div>

      {/* Active source banner */}
      <div className="bg-gradient-to-br from-accent to-accent-2 text-white rounded-[var(--radius-xl)] p-5 mb-8 shadow-[var(--shadow-sm)]">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-[var(--radius-md)] bg-white/15 flex items-center justify-center flex-shrink-0">
            <Smartphone size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase tracking-[0.08em] text-white/70 font-mono">
                Active capture source
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            </div>
            <div className="text-lg font-medium tracking-[-0.01em]">
              Mike&rsquo;s iPhone
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-white/80">
              <span className="flex items-center gap-1">
                <Battery size={12} />
                87%
              </span>
              <span className="flex items-center gap-1">
                <Signal size={12} />
                Strong
              </span>
              <span className="flex items-center gap-1">
                <Bluetooth size={12} />
                Bluetooth
              </span>
            </div>
          </div>
          <button
            type="button"
            className="text-[11px] text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full font-medium transition-colors flex-shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      {/* Paired devices */}
      <div className="bg-white border border-surface-3 rounded-[var(--radius-xl)] shadow-[var(--shadow-sm)] mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink">
              Paired devices
            </span>
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-accent-pale text-accent text-[11px] font-semibold font-mono">
              {paired.length}
            </span>
          </div>
          <Button variant="accent">
            <Plus size={12} />
            Pair new device
          </Button>
        </div>

        <div className="flex flex-col">
          {paired.map((d) => (
            <DeviceRow key={d.id} device={d} />
          ))}
        </div>
      </div>

      {/* Available / recommended */}
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-semibold text-ink">Supported devices</div>
          <div className="text-xs text-ink-3 mt-0.5">
            One-tap pair with tested hardware.
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-accent hover:text-accent-2 font-medium"
        >
          See compatibility list →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {available.map((a) => (
          <AvailableCard key={a.id} device={a} />
        ))}
      </div>
    </main>
  );
}

function DeviceRow({ device }: { device: PairedDevice }) {
  const Icon = device.icon;
  const isConnected = device.status === "connected";
  return (
    <div className="border-b border-surface-3 last:border-b-0 hover:bg-surface-2/40 transition-colors">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-surface-2 border border-surface-3 flex items-center justify-center flex-shrink-0 text-ink-2">
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink truncate">
              {device.name}
            </span>
            {device.isDefault ? (
              <span className="text-[9px] uppercase tracking-[0.08em] font-mono text-accent bg-accent-pale px-1.5 py-0.5 rounded-full">
                Default
              </span>
            ) : null}
          </div>
          <div className="text-xs text-ink-3 mt-0.5 truncate">
            {device.model}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[11px] text-ink-3 font-mono flex-shrink-0">
          {device.battery !== undefined ? (
            <span className="flex items-center gap-1">
              <Battery
                size={11}
                className={device.battery < 20 ? "text-active" : ""}
              />
              {device.battery}%
            </span>
          ) : null}
          {device.signal ? (
            <span className="flex items-center gap-1">
              <Wifi size={11} />
              {device.signal}
            </span>
          ) : null}
          <span>{device.lastSync}</span>
        </div>

        <StatusPill connected={isConnected} />

        <button
          type="button"
          aria-label="Device options"
          className="w-8 h-8 rounded-[var(--radius-sm)] text-ink-3 hover:text-ink hover:bg-surface-2 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium flex-shrink-0 " +
        (connected
          ? "bg-success-pale text-success"
          : "bg-surface-2 text-ink-3")
      }
    >
      <span
        className={
          "w-1.5 h-1.5 rounded-full " +
          (connected ? "bg-success animate-pulse" : "bg-ink-4")
        }
      />
      {connected ? "Connected" : "Offline"}
    </span>
  );
}

function AvailableCard({ device }: { device: AvailableDevice }) {
  const Icon = device.icon;
  const ready = device.status === "ready";
  return (
    <div className="bg-white border border-surface-3 rounded-[var(--radius-md)] p-4 flex flex-col gap-3 hover:border-ink-4 hover:shadow-[var(--shadow-sm)] transition-all">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-accent-pale text-accent flex items-center justify-center">
          <Icon size={18} />
        </div>
        {!ready ? (
          <span className="text-[10px] uppercase tracking-[0.06em] font-mono text-ink-3 bg-surface-2 px-1.5 py-0.5 rounded-full">
            Companion app
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-sm font-medium text-ink">{device.name}</div>
        <div className="text-xs text-ink-3 mt-0.5">{device.description}</div>
      </div>
      <button
        type="button"
        className={
          "w-full py-2 rounded-[var(--radius-sm)] text-xs font-medium transition-colors " +
          (ready
            ? "bg-ink text-white hover:bg-ink-2"
            : "bg-surface-2 text-ink-2 hover:bg-surface-3")
        }
      >
        {ready ? "Pair" : "Get app"}
      </button>
    </div>
  );
}
