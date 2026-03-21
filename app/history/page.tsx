"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { api, CallData } from "@/lib/api";
import { LANGUAGES } from "@/data/languages";
import Link from "next/link";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  const loc = locale === "fr" ? "fr-FR" : locale === "es" ? "es-ES" : "en-US";
  return d.toLocaleDateString(loc, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [calls, setCalls] = useState<CallData[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/auth/login");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) loadCalls(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loadCalls = async (off: number) => {
    try {
      const r = await api.getHistory(20, off);
      if (off === 0) setCalls(r.calls);
      else setCalls((prev) => [...prev, ...r.calls]);
      setHasMore(r.calls.length === 20);
      setOffset(off + r.calls.length);
    } catch { /* silent */ }
  };

  const handleRate = async (callId: number, rating: number) => {
    try {
      await api.rateCall(callId, rating);
      setCalls((prev) =>
        prev.map((c) => {
          if (c.id !== callId) return c;
          const isA = c.user_a === user?.id;
          return isA ? { ...c, rating_a: rating } : { ...c, rating_b: rating };
        })
      );
    } catch { /* silent */ }
  };

  const handleFollow = async (partnerId: string) => {
    try {
      await api.addFriend(partnerId);
      setCalls((prev) => prev.map((c) => c.partner_id === partnerId ? { ...c, is_following: 1 } : c));
    } catch { /* silent */ }
  };

  if (loading || !user) return <div className="min-h-screen bg-bg-deep" />;

  return (
    <div className="min-h-screen bg-bg-deep px-6 py-12 pb-24 overflow-y-auto">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-sm text-text-dim hover:text-text-secondary font-body mb-6 inline-block">&larr; {t("common.back")}</Link>

        <h1 className="text-2xl font-display font-bold text-text mb-6">{t("history.title")}</h1>

        {calls.length === 0 ? (
          <p className="text-text-dim font-body text-sm">{t("history.noCalls")}</p>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => {
              const isA = call.user_a === user.id;
              const myRating = isA ? call.rating_a : call.rating_b;
              const langInfo = call.partner_language ? LANGUAGES.find((l) => l.code === call.partner_language) : null;

              return (
                <div key={call.id} className="bg-surface rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-body font-semibold text-accent flex-shrink-0">
                      {(call.partner_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-body text-text truncate flex items-center gap-1.5">
                          {call.partner_country && (
                            <img src={`https://flagcdn.com/w40/${call.partner_country.toLowerCase()}.png`} width={16} height={12} alt="" className="inline-block rounded-sm" />
                          )}
                          {call.partner_name || t("common.anonymous")}
                        </p>
                        {call.is_following ? (
                          <span className="text-[10px] font-body text-accent bg-accent/10 px-2 py-0.5 rounded-full flex-shrink-0">{t("history.following")}</span>
                        ) : call.partner_id && (
                          <button onClick={() => handleFollow(call.partner_id)}
                            className="text-[10px] font-body text-text-secondary hover:text-accent bg-surface-hover px-2 py-0.5 rounded-full flex-shrink-0 transition-colors">
                            + {t("history.follow")}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] font-body text-text-dim mt-0.5">
                        {formatDate(call.started_at, locale)} &middot; {formatDuration(call.duration)}
                        {langInfo && <> &middot; {langInfo.name}</>}
                      </p>
                      {call.partner_tags && call.partner_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {call.partner_tags.map((tag) => (
                            <span key={tag} className="text-[10px] font-body text-text-dim bg-bg-deep px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex-shrink-0">
                      {myRating == null ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleRate(call.id, 1)}
                            className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-danger hover:bg-danger/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" />
                            </svg>
                          </button>
                          <button onClick={() => handleRate(call.id, 5)}
                            className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-success hover:bg-success/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <span className={`text-xs font-body font-medium px-2 py-1 rounded-full ${
                          myRating >= 4 ? "text-success bg-success/10" : "text-danger bg-danger/10"
                        }`}>
                          {myRating >= 4 ? t("history.liked") : t("history.disliked")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button onClick={() => loadCalls(offset)}
                className="w-full py-2.5 text-sm text-text-secondary font-body hover:text-text transition-colors">
                {t("history.loadMore")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
