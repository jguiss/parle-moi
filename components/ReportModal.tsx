"use client";

import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  onReport: (reason: string) => void;
  onBlock: () => void;
  partnerName: string | null;
}

export function ReportModal({ open, onClose, onReport, onBlock, partnerName }: ReportModalProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const REASONS = [
    t("report.inappropriate"),
    t("report.nudity"),
    t("report.harassment"),
    t("report.spam"),
    t("report.hate"),
    t("report.other"),
  ];

  if (!open) return null;

  const handleReport = () => {
    const finalReason = reason === t("report.other") ? customReason.trim() : reason;
    if (finalReason) {
      onReport(finalReason);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-bg border border-white/[0.06] rounded-2xl p-6 max-w-sm w-full pointer-events-auto">
          <h3 className="text-lg font-display font-bold text-text mb-1">{t("report.title")}</h3>
          <p className="text-sm text-text-secondary font-body mb-4">
            {t("report.title")} {partnerName || t("report.thisUser")}
          </p>

          <div className="space-y-2 mb-4">
            {REASONS.map((r) => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-body transition-colors ${
                  reason === r ? "bg-accent text-white" : "bg-surface text-text-secondary hover:bg-surface-hover"
                }`}>
                {r}
              </button>
            ))}
          </div>

          {reason === t("report.other") && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t("report.describeProblem")}
              className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 mb-4 resize-none"
            />
          )}

          <div className="flex gap-2">
            <button onClick={handleReport}
              disabled={!reason || (reason === t("report.other") && !customReason.trim())}
              className="flex-1 py-2.5 rounded-xl bg-danger text-white font-body font-semibold text-sm disabled:opacity-50 transition-all active:scale-95">
              {t("report.submit")}
            </button>
            <button onClick={() => { onBlock(); onClose(); }}
              className="flex-1 py-2.5 rounded-xl bg-surface text-danger font-body font-semibold text-sm hover:bg-surface-hover transition-colors">
              {t("report.block")}
            </button>
          </div>

          <button onClick={onClose}
            className="w-full mt-2 py-2 text-sm text-text-dim font-body hover:text-text-secondary transition-colors">
            {t("report.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
