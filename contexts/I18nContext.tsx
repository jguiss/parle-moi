"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { translations, Locale, LOCALES } from "../data/translations";

interface I18nContextType {
  locale: Locale;
  toggleLocale: () => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("fr");

  useEffect(() => {
    const saved = localStorage.getItem("parle-moi-locale") as Locale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocale(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("parle-moi-locale", locale);
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale((l) => {
      const idx = LOCALES.indexOf(l);
      return LOCALES[(idx + 1) % LOCALES.length];
    });
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] ?? translations["fr"][key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
