"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { api } from "@/lib/api";
import { COUNTRIES } from "@/data/countries";
import { LANGUAGES } from "@/data/languages";
import Link from "next/link";

export default function AccountPage() {
  const { user, loading, logout, refreshUser, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [spokenLanguages, setSpokenLanguages] = useState<string[]>([]);
  const [langSearch, setLangSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [friendCount, setFriendCount] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setCountry(user.country || "");
      setGender(user.gender || "");
      setTags(user.tags || []);
      setSpokenLanguages(user.languages || (user.language ? [user.language] : []));
      api.getFriends().then((data) => setFriendCount(data.friends.length)).catch(() => {});
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      await api.updateProfile({ name, country: country || undefined, language: spokenLanguages[0] || undefined, gender: gender || undefined });
      await api.updateTags(tags);
      await api.updateLanguages(spokenLanguages);
      await refreshUser();
      setMessage(t("account.profileSaved"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t("account.saveFailed"));
    }
    setSaving(false);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && tags.length < 3 && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const toggleLanguage = (code: string) => {
    setSpokenLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code]
    );
  };

  const selectedCountry = COUNTRIES.find((c) => c.code === country);
  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES.slice(0, 30);

  const filteredLanguages = langSearch.trim()
    ? LANGUAGES.filter(
        (l) =>
          l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
          l.nativeName.toLowerCase().includes(langSearch.toLowerCase())
      )
    : LANGUAGES.slice(0, 20);

  if (loading || !user) return <div className="min-h-screen bg-bg-deep" />;

  return (
    <div className="min-h-screen bg-bg-deep px-6 py-12 pb-24 overflow-y-auto">
      <div className="max-w-md mx-auto">
        <Link href="/" className="text-sm text-text-dim hover:text-text-secondary font-body mb-6 inline-block">&larr; {t("account.backToChat")}</Link>

        <h1 className="text-2xl font-display font-bold text-text mb-1">{t("account.myAccount")}</h1>
        <p className="text-sm text-text-secondary font-body mb-8">{user.email} {user.emailVerified ? t("account.verified") : t("account.notVerified")}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-surface rounded-xl p-3 text-center">
            <p className="text-lg font-display font-bold text-accent">{user.reputationScore.toFixed(1)}</p>
            <p className="text-[11px] text-text-dim font-body">{t("account.reputation")}</p>
          </div>
          <Link href="/friends" className="bg-surface rounded-xl p-3 text-center hover:bg-surface-hover transition-colors">
            <p className="text-lg font-display font-bold text-success">{friendCount}</p>
            <p className="text-[11px] text-text-dim font-body">{t("account.friends")}</p>
          </Link>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.name")}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
              className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 transition-colors" />
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.country")}</label>
            <button type="button" onClick={() => setCountryOpen(!countryOpen)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 transition-colors text-left">
              {selectedCountry ? (
                <>
                  <img src={`https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png`} width={20} height={15} alt="" className="inline-block rounded-sm" />
                  <span>{selectedCountry.name}</span>
                </>
              ) : (
                <span className="text-text-dim">{t("account.notSpecified")}</span>
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
                  placeholder={t("account.searchCountry") || "Rechercher un pays..."}
                  className="w-full px-4 py-2.5 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 mb-1"
                  autoFocus
                />
                <div className="max-h-48 overflow-y-auto bg-surface rounded-xl border border-white/[0.06]">
                  <button
                    onClick={() => { setCountry(""); setCountryOpen(false); setCountrySearch(""); }}
                    className={`w-full text-left px-4 py-2 text-sm font-body transition-colors ${!country ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-surface-hover hover:text-text"}`}>
                    {t("account.notSpecified")}
                  </button>
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCountry(c.code); setCountryOpen(false); setCountrySearch(""); }}
                      className={`w-full text-left px-4 py-2 text-sm font-body transition-colors flex items-center gap-2 ${
                        country === c.code ? "bg-accent/10 text-accent" : "text-text-secondary hover:bg-surface-hover hover:text-text"
                      }`}>
                      <img src={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png`} width={20} height={15} alt="" className="inline-block rounded-sm flex-shrink-0" />
                      <span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Multi-language selection */}
          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.spokenLanguages")}</label>
            {spokenLanguages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {spokenLanguages.map((code) => {
                  const lang = LANGUAGES.find((l) => l.code === code);
                  return (
                    <span key={code} className="bg-accent/15 text-accent px-3 py-1 rounded-full text-xs font-body flex items-center gap-1.5">
                      {lang ? `${lang.name} (${lang.nativeName})` : code}
                      <button onClick={() => toggleLanguage(code)} className="hover:text-white">&times;</button>
                    </span>
                  );
                })}
              </div>
            )}
            <input
              type="text"
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              placeholder={t("account.searchLanguage") || "Rechercher une langue..."}
              className="w-full px-4 py-2.5 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 mb-2"
            />
            <div className="max-h-40 overflow-y-auto bg-surface rounded-xl border border-white/[0.06]">
              {filteredLanguages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => toggleLanguage(l.code)}
                  className={`w-full text-left px-4 py-2 text-sm font-body transition-colors flex items-center justify-between ${
                    spokenLanguages.includes(l.code)
                      ? "bg-accent/10 text-accent"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text"
                  }`}
                >
                  <span>{l.name} ({l.nativeName})</span>
                  {spokenLanguages.includes(l.code) && <span className="text-accent">&#10003;</span>}
                </button>
              ))}
              {filteredLanguages.length === 0 && (
                <p className="px-4 py-3 text-sm text-text-dim font-body">{t("account.noResults") || "Aucun résultat"}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.gender")}</label>
            <div className="flex gap-2">
              {[{ v: "male", l: t("account.male") }, { v: "female", l: t("account.female") }, { v: "other", l: t("account.other") }].map((g) => (
                <button key={g.v} onClick={() => setGender(gender === g.v ? "" : g.v)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-body font-medium transition-all ${gender === g.v ? "bg-accent text-white" : "bg-surface text-text-secondary hover:bg-surface-hover"}`}>
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.tags")}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <span key={t} className="bg-accent/15 text-accent px-3 py-1 rounded-full text-xs font-body flex items-center gap-1.5">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-white">&times;</button>
                </span>
              ))}
            </div>
            {tags.length < 3 && (
              <div className="flex gap-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} maxLength={30}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-2.5 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50"
                  placeholder={t("account.tagsPlaceholder")} />
                <button onClick={addTag} className="px-4 py-2.5 bg-surface hover:bg-surface-hover rounded-xl text-text-secondary text-sm font-body transition-colors">{t("account.add")}</button>
              </div>
            )}
          </div>
        </div>

        {message && (
          <p className={`mt-4 text-sm font-body ${message.includes(t("account.saveFailed")) || message.includes("Échec") || message.includes("fail") ? "text-danger" : "text-success"}`}>{message}</p>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-soft text-white font-body font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
          {saving ? t("account.saving") : t("account.saveProfile")}
        </button>

        {/* Password change */}
        <div className="mt-6">
          <button onClick={() => setPasswordOpen(!passwordOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface-hover rounded-xl text-sm font-body text-text-secondary transition-colors">
            <span>{t("account.changePassword")}</span>
            <svg className={`w-4 h-4 transition-transform ${passwordOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {passwordOpen && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.currentPassword")}</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-text-secondary font-body mb-1.5">{t("account.newPassword")}</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50 transition-colors" />
              </div>
              {passwordMessage && (
                <p className={`text-sm font-body ${passwordMessage.includes("modifié") || passwordMessage.includes("changed") ? "text-success" : "text-danger"}`}>{passwordMessage}</p>
              )}
              <button onClick={async () => {
                setChangingPassword(true);
                setPasswordMessage("");
                try {
                  const res = await api.changePassword(currentPassword, newPassword);
                  setPasswordMessage(res.message);
                  setCurrentPassword("");
                  setNewPassword("");
                } catch (err) {
                  setPasswordMessage(err instanceof Error ? err.message : "Échec du changement");
                }
                setChangingPassword(false);
              }} disabled={changingPassword || !currentPassword || newPassword.length < 8}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-soft text-white font-body font-semibold text-sm transition-all active:scale-95 disabled:opacity-50">
                {changingPassword ? t("account.changing") : t("account.changePassword")}
              </button>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="w-full mt-3 py-3 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary font-body text-sm transition-colors flex items-center justify-center gap-2">
          {theme === "dark" ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {theme === "dark" ? t("account.lightMode") : t("account.darkMode")}
        </button>

        <button onClick={() => { logout(); router.push("/"); }}
          className="w-full mt-3 py-3 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary font-body text-sm transition-colors">
          {t("account.logout")}
        </button>
      </div>
    </div>
  );
}
