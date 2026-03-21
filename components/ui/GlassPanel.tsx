"use client";

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = "" }: GlassPanelProps) {
  return (
    <div
      className={`backdrop-blur-md bg-black/40 border border-white/[0.06] ${className}`}
    >
      {children}
    </div>
  );
}
