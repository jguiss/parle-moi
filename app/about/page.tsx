"use client";

import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-bg-deep px-6 py-12 pb-24 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-text-dim hover:text-text-secondary font-body mb-6 inline-block">
          &larr; {t("common.back")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center shadow-lg shadow-accent/20">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3c-5.5 0-10 3.6-10 8s4.5 8 10 8c.9 0 1.8-.1 2.6-.3l4.3 2.2-.8-3.5C20 15.6 22 13 22 11c0-4.4-4.5-8-10-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold text-text">Parle-moi</h1>
        </div>

        <div className="space-y-4 text-sm font-body text-text-secondary leading-relaxed">
          <p>{t("about.intro")}</p>
          <p>{t("about.mission")}</p>

          <div className="bg-surface rounded-xl p-4 space-y-2">
            <h2 className="text-text font-display font-semibold text-base">{t("about.howItWorksTitle")}</h2>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>{t("about.step1")}</li>
              <li>{t("about.step2")}</li>
              <li>{t("about.step3")}</li>
              <li>{t("about.step4")}</li>
            </ul>
          </div>

          <div className="bg-surface rounded-xl p-4 space-y-2">
            <h2 className="text-text font-display font-semibold text-base">{t("about.safetyTitle")}</h2>
            <p>{t("about.safetyText")}</p>
          </div>

          <p className="text-text-dim text-xs pt-4">{t("about.version")}</p>
        </div>
      </div>
    </div>
  );
}
