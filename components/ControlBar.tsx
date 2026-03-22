"use client";

import { useI18n } from "@/contexts/I18nContext";

interface ControlBarProps {
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onNext: () => void;
  onStop: () => void;
  onOpenFilters: () => void;
  isConnected: boolean;
}

function ControlButton({
  onClick,
  label,
  variant = "default",
  active = true,
  size = "normal",
  children,
}: {
  onClick: () => void;
  label: string;
  variant?: "default" | "accent" | "danger";
  active?: boolean;
  size?: "normal" | "large";
  children: React.ReactNode;
}) {
  const baseClasses =
    "rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 focus:outline-none focus:ring-2 focus:ring-accent/50";

  const sizeClasses = size === "large" ? "w-14 h-14" : "w-12 h-12";

  const variantClasses = {
    default: active
      ? "bg-surface hover:bg-surface-hover text-text"
      : "bg-danger/20 hover:bg-danger/30 text-danger",
    accent: "bg-gradient-to-br from-accent to-accent-soft text-white shadow-lg shadow-accent/20",
    danger: "bg-danger/20 hover:bg-danger/30 text-danger",
  };

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}

export function ControlBar({
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onNext,
  onStop,
  onOpenFilters,
  isConnected,
}: ControlBarProps) {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 bg-bg-deep border-t border-white/[0.06] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      {/* Mic toggle */}
      <ControlButton
        onClick={onToggleMic}
        label={micOn ? t("videoChat.micOff") : t("videoChat.micOn")}
        active={micOn}
      >
        {micOn ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 15a3 3 0 003-3V5a3 3 0 00-6 0v7a3 3 0 003 3z" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        )}
      </ControlButton>

      {/* Cam toggle */}
      <ControlButton
        onClick={onToggleCam}
        label={camOn ? t("videoChat.camOff") : t("videoChat.camOn")}
        active={camOn}
      >
        {camOn ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        )}
      </ControlButton>

      {/* Next button — large accent */}
      <ControlButton
        onClick={onNext}
        label={t("videoChat.nextPartner")}
        variant="accent"
        size="large"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </ControlButton>

      {/* Stop button */}
      <ControlButton
        onClick={onStop}
        label={isConnected ? t("videoChat.endChat") : t("videoChat.stop")}
        variant="danger"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </ControlButton>

      {/* Filters */}
      <ControlButton onClick={onOpenFilters} label={t("videoChat.filters")}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </ControlButton>
    </div>
  );
}
