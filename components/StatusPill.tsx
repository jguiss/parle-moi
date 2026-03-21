"use client";

import { GlassPanel } from "./ui/GlassPanel";

type Status = "disconnected" | "searching" | "connected" | "partner_left";

interface StatusPillProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; color: string; pulse: boolean }> = {
  disconnected: { label: "Déconnecté", color: "bg-text-dim", pulse: false },
  searching: { label: "Recherche...", color: "bg-warning", pulse: true },
  connected: { label: "Connecté", color: "bg-success", pulse: false },
  partner_left: { label: "Partenaire parti", color: "bg-danger", pulse: false },
};

export function StatusPill({ status }: StatusPillProps) {
  const config = statusConfig[status];

  return (
    <GlassPanel className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full">
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={`animate-pulseRing absolute inset-0 rounded-full ${config.color} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
      </span>
      <span className="text-xs font-body font-medium text-text">{config.label}</span>
    </GlassPanel>
  );
}
