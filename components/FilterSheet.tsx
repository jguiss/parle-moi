"use client";

import { useState } from "react";
import { COUNTRIES } from "@/data/countries";
import { LANGUAGES } from "@/data/languages";
import { useI18n } from "@/contexts/I18nContext";

export interface Filters {
  region: string;
  country: string;
  language: string;
  gender: string;
  tags: string[];
}

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  currentFilters: Filters;
  onApply: (filters: Filters) => void;
  userTags?: string[];
}

function FilterOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-body font-medium transition-all duration-200 active:scale-90 ${
        selected
          ? "bg-accent text-white"
          : "bg-surface hover:bg-surface-hover text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterSheet({ open, onClose, currentFilters, onApply, userTags = [] }: FilterSheetProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<Filters>(currentFilters);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  if (!open) return null;

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const regionOptions = [
    { value: "worldwide", label: t("filter.worldwide") },
    { value: "north-america", label: t("filter.northAmerica") },
    { value: "south-america", label: t("filter.southAmerica") },
    { value: "europe", label: t("filter.europe") },
    { value: "asia", label: t("filter.asia") },
    { value: "africa", label: t("filter.africa") },
    { value: "oceania", label: t("filter.oceania") },
  ];

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES
        .filter((c) => filters.region === "worldwide" || c.region === filters.region)
        .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES
        .filter((c) => filters.region === "worldwide" || c.region === filters.region)
        .slice(0, 30);

  const selectedCountry = COUNTRIES.find((c) => c.code === filters.country);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !filters.tags.includes(tag) && filters.tags.length < 5) {
      set("tags", [...filters.tags, tag]);
      setTagInput("");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slideUp">
        <div className="bg-bg border-t border-white/[0.06] rounded-t-2xl px-6 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
          <div className="w-10 h-1 rounded-full bg-text-dim/30 mx-auto mb-6" />
          <h3 className="text-lg font-display font-bold text-text mb-6">{t("filter.title")}</h3>

          {/* Region */}
          <div className="mb-5">
            <p className="text-sm font-body font-medium text-text-secondary mb-3">{t("filter.region")}</p>
            <div className="flex flex-wrap gap-2">
              {regionOptions.map((r) => (
                <FilterOption key={r.value} label={r.label} selected={filters.region === r.value}
                  onClick={() => { set("region", r.value); set("country", ""); }} />
              ))}
            </div>
          </div>

          {/* Country - custom dropdown with flags */}
          <div className="mb-5">
            <p className="text-sm font-body font-medium text-text-secondary mb-3">{t("filter.country")}</p>
            <button type="button" onClick={() => setCountryOpen(!countryOpen)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 transition-colors text-left">
              {selectedCountry ? (
                <>
                  <img src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} width={20} height={15} alt="" className="inline-block rounded-sm" />
                  <span>{selectedCountry.name}</span>
                </>
              ) : (
                <span className="text-text-dim">{t("filter.allCountries")}</span>
              )}
              <svg className={`w-4 h-4 ml-auto transition-transform ${countryOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {countryOpen && (
              <div className="mt-1">
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder={t("filter.searchCountry")}
                  className="w-full px-4 py-2 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 mb-1"
                  autoFocus
                />
                <div className="max-h-40 overflow-y-auto bg-surface rounded-xl border border-white/[0.06]">
                  <button
                    onClick={() => { set("country", ""); setCountryOpen(false); setCountrySearch(""); }}
                    className={`w-full text-left px-4 py-2 text-sm font-body transition-colors ${!filters.country ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-surface-hover hover:text-text"}`}>
                    {t("filter.allCountries")}
                  </button>
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { set("country", c.code); setCountryOpen(false); setCountrySearch(""); }}
                      className={`w-full text-left px-4 py-2 text-sm font-body transition-colors flex items-center gap-2 ${
                        filters.country === c.code ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-surface-hover hover:text-text"
                      }`}>
                      <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} width={20} height={15} alt="" className="inline-block rounded-sm flex-shrink-0" />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Language */}
          <div className="mb-5">
            <p className="text-sm font-body font-medium text-text-secondary mb-3">{t("filter.language")}</p>
            <select
              value={filters.language}
              onChange={(e) => set("language", e.target.value)}
              className="w-full px-4 py-2.5 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50"
            >
              <option value="">{t("filter.allLanguages")}</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name} ({l.nativeName})</option>
              ))}
            </select>
          </div>

          {/* Gender */}
          <div className="mb-5">
            <p className="text-sm font-body font-medium text-text-secondary mb-3">{t("filter.gender")}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "", l: t("filter.everyone") },
                { v: "male", l: t("account.male") },
                { v: "female", l: t("account.female") },
                { v: "other", l: t("account.other") },
              ].map((g) => (
                <FilterOption key={g.v} label={g.l} selected={filters.gender === g.v}
                  onClick={() => set("gender", g.v)} />
              ))}
            </div>
          </div>

          {/* Tags - free text input */}
          <div className="mb-6">
            <p className="text-sm font-body font-medium text-text-secondary mb-2">{t("filter.tags")}</p>
            <p className="text-xs text-text-dim font-body mb-3">{t("filter.tagsHint")}</p>
            {filters.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {filters.tags.map((tag) => (
                  <span key={tag} className="bg-accent/15 text-accent px-3 py-1 rounded-full text-xs font-body flex items-center gap-1.5">
                    {tag}
                    <button onClick={() => set("tags", filters.tags.filter((x) => x !== tag))} className="hover:text-white">&times;</button>
                  </span>
                ))}
              </div>
            )}
            {filters.tags.length < 5 && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder={t("filter.tagsPlaceholder")}
                  className="flex-1 px-4 py-2 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50"
                />
                <button onClick={addTag} className="px-4 py-2 bg-surface hover:bg-surface-hover rounded-xl text-text-secondary text-sm font-body transition-colors">
                  {t("account.add")}
                </button>
              </div>
            )}
            {userTags.length > 0 && (
              <div className="mt-2">
                <p className="text-[11px] text-text-dim font-body mb-1">{t("filter.myTags")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {userTags.filter((t) => !filters.tags.includes(t)).map((tag) => (
                    <button key={tag} onClick={() => set("tags", [...filters.tags, tag])}
                      className="px-2.5 py-1 rounded-full text-[11px] font-body bg-surface hover:bg-surface-hover text-text-secondary transition-colors">
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { onApply(filters); onClose(); }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-soft text-white font-body font-semibold text-sm transition-all duration-200 active:scale-95"
          >
            {t("filter.apply")}
          </button>
        </div>
      </div>
    </>
  );
}
