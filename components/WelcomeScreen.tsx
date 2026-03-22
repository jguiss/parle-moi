"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { Locale } from "@/data/translations";

interface WelcomeScreenProps {
  stream: MediaStream | null;
  cameraError: string | null;
  onlineCount: number;
  onStart: () => void;
  isLoading: boolean;
}

export function WelcomeScreen({ stream, cameraError, onlineCount, onStart, isLoading }: WelcomeScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale, setLocale, t } = useI18n();
  const [langOpen, setLangOpen] = useState(false);

  const LANG_OPTIONS: { code: Locale; flag: string; label: string; abbr: string }[] = [
    { code: "fr", flag: "https://flagcdn.com/24x18/fr.png", label: "Fran\u00e7ais", abbr: "FR" },
    { code: "en", flag: "https://flagcdn.com/24x18/gb.png", label: "English", abbr: "EN" },
    { code: "es", flag: "https://flagcdn.com/24x18/es.png", label: "Espa\u00f1ol", abbr: "ES" },
  ];

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="fixed inset-0 z-30 bg-bg-deep flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Nav */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        {/* Language dropdown */}
        <div className="relative">
          <button onClick={() => setLangOpen((v) => !v)} title={t("welcome.switchLang")}
            className="h-8 px-2 rounded-full bg-surface hover:bg-surface-hover flex items-center gap-1.5 transition-colors text-[11px] font-body font-bold text-text-secondary">
            <img src={LANG_OPTIONS.find((l) => l.code === locale)!.flag} width={16} height={12} alt="" className="rounded-[2px]" />
            {LANG_OPTIONS.find((l) => l.code === locale)!.abbr}
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setLangOpen(false)} />
              <div className="absolute left-0 top-10 z-40 w-40 bg-surface border border-black/10 dark:border-white/[0.06] rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                {LANG_OPTIONS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLocale(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-body transition-colors ${
                      locale === lang.code
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-text-secondary hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    <img src={lang.flag} width={20} height={15} alt="" className="rounded-[2px]" />
                    <span className="flex-1 text-left">{lang.label}</span>
                    {locale === lang.code && (
                      <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme} title={theme === "dark" ? t("welcome.lightMode") : t("welcome.darkMode")}
          className="w-8 h-8 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center transition-colors">
          {theme === "dark" ? (
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <Link href="/about" className="text-xs text-text-secondary hover:text-text font-body transition-colors">{t("welcome.about")}</Link>
        {isAuthenticated ? (
          <>
            {user?.isAdmin && (
              <Link href="/admin" className="text-xs text-accent hover:text-accent-soft font-body font-medium transition-colors">{t("welcome.admin")}</Link>
            )}
            <Link href="/friends" className="text-xs text-text-secondary hover:text-text font-body transition-colors">{t("welcome.friends")}</Link>
            <Link href="/history" className="text-xs text-text-secondary hover:text-text font-body transition-colors">{t("welcome.history")}</Link>
            <Link href="/account" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-hover transition-colors">
              <span className="text-xs font-body text-text">{user?.name}</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="text-xs text-text-secondary hover:text-text font-body transition-colors">{t("welcome.login")}</Link>
            <Link href="/auth/register" className="text-xs px-3 py-1.5 rounded-full bg-accent text-white font-body font-medium hover:bg-accent-soft transition-colors">
              {t("welcome.createAccount")}
            </Link>
          </>
        )}
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/10 blur-[120px] animate-breathe pointer-events-none" />

      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjciIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]" />

      {/* Logo */}
      <div className="animate-fadeUp mb-3 flex items-center gap-3" style={{ animationDelay: "0ms" }}>
        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center shadow-lg shadow-accent/20">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3c-5.5 0-10 3.6-10 8s4.5 8 10 8c.9 0 1.8-.1 2.6-.3l4.3 2.2-.8-3.5C20 15.6 22 13 22 11c0-4.4-4.5-8-10-8z" />
          </svg>
        </div>
        <h1 className="text-4xl font-display font-extrabold bg-gradient-to-r from-accent to-accent-soft bg-clip-text text-transparent">
          {t("welcome.title")}
        </h1>
      </div>

      <p className="animate-fadeUp text-text-secondary text-center text-sm font-body max-w-xs mb-8 opacity-0" style={{ animationDelay: "100ms" }}>
        {t("welcome.subtitle")}
      </p>

      {/* Camera preview */}
      <div className="animate-fadeUp relative w-[180px] h-[240px] rounded-2xl overflow-hidden bg-surface mb-6 opacity-0 shadow-xl" style={{ animationDelay: "200ms" }}>
        {stream ? (
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
        ) : (
          <div className="flex items-center justify-center h-full">
            {cameraError ? (
              <div className="px-4 text-center">
                <svg className="w-8 h-8 text-danger mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                </svg>
                <p className="text-xs text-danger font-body">{t(cameraError)}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      <button onClick={onStart} disabled={isLoading || !!cameraError}
        className="animate-fadeUp opacity-0 px-8 py-4 rounded-full bg-gradient-to-r from-accent to-accent-soft text-white font-body font-semibold text-base shadow-lg shadow-accent/25 transition-all duration-200 active:scale-95 hover:shadow-xl hover:shadow-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ animationDelay: "300ms" }}>
        {t("welcome.start")}
      </button>

      <div className="animate-fadeUp opacity-0 mt-6 flex items-center gap-2" style={{ animationDelay: "400ms" }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-pulseRing absolute inset-0 rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </span>
        <span className="text-xs text-text-dim font-body">
          {onlineCount} {t("welcome.online")}
        </span>
      </div>
    </div>
  );
}
