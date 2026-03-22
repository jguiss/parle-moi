"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { VideoFeed } from "./VideoFeed";
import { ControlBar } from "./ControlBar";
import { StatusPill } from "./StatusPill";
import { FilterSheet, Filters } from "./FilterSheet";
import { ReportModal } from "./ReportModal";
import { showToast } from "./Toast";
import { playMatchSound, playDisconnectSound } from "@/lib/sounds";
import { useSocket } from "@/hooks/useSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useTimer } from "@/hooks/useTimer";
import { GlassPanel } from "./ui/GlassPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { COUNTRIES } from "@/data/countries";
import { LANGUAGES } from "@/data/languages";

type AppState = "searching" | "connected" | "partner_left" | "disconnected";

interface MediaControls {
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  toggleMic: () => void;
  toggleCam: () => void;
  error: string | null;
  startStream: () => Promise<MediaStream | null>;
  stopStream: () => void;
}

interface VideoChatProps {
  media: MediaControls;
}

export function VideoChat({ media }: VideoChatProps) {
  const { stream, micOn, camOn, toggleMic, toggleCam } = media;
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();

  const [appState, setAppState] = useState<AppState>("searching");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    region: "worldwide", country: "", language: "", gender: "", tags: [],
  });

  const partnerIdRef = useRef<string | null>(null);
  const partnerUserIdRef = useRef<string | null>(null);
  const partnerNameRef = useRef<string | null>(null);
  const callIdRef = useRef<number | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);

  const timer = useTimer();

  // Refs for WebRTC callbacks
  const createOfferRef = useRef<(partnerId: string) => Promise<void>>();
  const handleOfferRef = useRef<(partnerId: string, offer: RTCSessionDescriptionInit) => Promise<void>>();
  const handleAnswerRef = useRef<(answer: RTCSessionDescriptionInit) => Promise<void>>();
  const handleIceCandidateRef = useRef<(candidate: RTCIceCandidateInit) => Promise<void>>();
  const closeConnectionRef = useRef<() => void>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const joinQueueRef = useRef<(filters?: any) => void>();
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const getQueueFilters = useCallback(() => ({
    region: filtersRef.current.region,
    country: filtersRef.current.country || undefined,
    language: filtersRef.current.language || undefined,
    gender: filtersRef.current.gender || undefined,
    tags: filtersRef.current.tags.length > 0 ? filtersRef.current.tags : undefined,
  }), []);

  const { sendSignal, joinQueue, next: socketNext, connect: socketConnect, socket } = useSocket({
    onMatched: useCallback((data: {
      partnerId: string; isInitiator: boolean;
      partnerUserId?: string; partnerName?: string; callId?: number;
    }) => {
      partnerIdRef.current = data.partnerId;
      partnerUserIdRef.current = data.partnerUserId || null;
      partnerNameRef.current = data.partnerName || null;
      callIdRef.current = data.callId || null;
      setPartnerName(data.partnerName || null);
      showToast(t("videoChat.partnerFound"), "success");
      playMatchSound();
      if (data.isInitiator) createOfferRef.current?.(data.partnerId);
    }, []),

    onSignal: useCallback((data: { from: string; signal: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
      const signal = data.signal as RTCSessionDescriptionInit;
      if (signal.type === "offer") handleOfferRef.current?.(data.from, signal);
      else if (signal.type === "answer") handleAnswerRef.current?.(signal);
      else handleIceCandidateRef.current?.(data.signal as RTCIceCandidateInit);
    }, []),

    onPartnerLeft: useCallback(() => {
      setAppState("partner_left");
      showToast(t("videoChat.partnerLeft"), "warning");
      playDisconnectSound();
      timer.reset();
      closeConnectionRef.current?.();
      setShowRating(true);
      setTimeout(() => {
        setShowRating(false);
        setAppState("searching");
        showToast(t("videoChat.searchingNew"), "info");
        joinQueueRef.current?.(filtersRef.current);
      }, 3000);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  });

  joinQueueRef.current = (f) => joinQueue(f || getQueueFilters());

  const { remoteStream, connectionStatus, createOffer, handleOffer, handleAnswer, handleIceCandidate, closeConnection } =
    useWebRTC({
      localStream: stream,
      sendSignal,
      onConnectionStateChange: useCallback((state: string) => {
        if (state === "connected") {
          setAppState("connected");
          timer.start();
        } else if (state === "failed") {
          showToast(t("videoChat.connectionFailed"), "error");
          closeConnectionRef.current?.();
          setAppState("searching");
          joinQueueRef.current?.(filtersRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []),
    });

  createOfferRef.current = createOffer;
  handleOfferRef.current = handleOffer;
  handleAnswerRef.current = handleAnswer;
  handleIceCandidateRef.current = handleIceCandidate;
  closeConnectionRef.current = closeConnection;

  // Pass auth token to socket — wait for stream before joining queue
  useEffect(() => {
    const token = localStorage.getItem("parle-moi-token");
    if (token) {
      socket.auth = { token };
    }
    socketConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only join queue once the camera stream is available
  const hasJoinedRef = useRef(false);
  useEffect(() => {
    if (stream && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinQueue(getQueueFilters());
      showToast(t("videoChat.lookingNew"), "info");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  const handleNext = useCallback(() => {
    closeConnection();
    socketNext();
    timer.reset();
    setShowRating(false);
    partnerIdRef.current = null;
    partnerUserIdRef.current = null;
    setPartnerName(null);
    callIdRef.current = null;
    setAppState("searching");
    showToast(t("videoChat.lookingNew"), "info");
    joinQueue(getQueueFilters());
  }, [closeConnection, socketNext, timer, joinQueue, getQueueFilters]);

  const handleStop = useCallback(() => {
    closeConnection();
    socketNext();
    timer.reset();
    setShowRating(false);
    partnerIdRef.current = null;
    partnerUserIdRef.current = null;
    setPartnerName(null);
    callIdRef.current = null;
    setAppState("disconnected");
    showToast(t("videoChat.ended"), "info");
  }, [closeConnection, socketNext, timer]);

  const handleToggleMic = useCallback(() => {
    toggleMic();
    showToast(micOn ? t("videoChat.micOff") : t("videoChat.micOn"), "info");
  }, [toggleMic, micOn]);

  const handleToggleCam = useCallback(() => {
    toggleCam();
    showToast(camOn ? t("videoChat.camOff") : t("videoChat.camOn"), "info");
  }, [toggleCam, camOn]);

  const handleApplyFilters = useCallback((f: Filters) => {
    setFilters(f);
    if (appState === "searching") {
      socketNext();
      joinQueue({
        region: f.region,
        country: f.country || undefined,
        language: f.language || undefined,
        gender: f.gender || undefined,
        tags: f.tags.length > 0 ? f.tags : undefined,
      });
    }
  }, [appState, socketNext, joinQueue]);

  const handleAddFriend = useCallback(() => {
    if (partnerUserIdRef.current) {
      socket.emit("add-friend", { partnerUserId: partnerUserIdRef.current });
      showToast(t("videoChat.followAdded"), "success");
    } else {
      showToast(t("videoChat.needAccount"), "warning");
    }
  }, [socket]);

  const handleReport = useCallback((reason: string) => {
    if (partnerUserIdRef.current) {
      socket.emit("report-user", { reportedUserId: partnerUserIdRef.current, reason });
      showToast(t("videoChat.reportSent"), "info");
    }
  }, [socket]);

  const handleBlock = useCallback(() => {
    if (partnerUserIdRef.current) {
      socket.emit("block-user", { blockedUserId: partnerUserIdRef.current });
      showToast(t("videoChat.userBlocked"), "info");
      handleNext();
    }
  }, [socket, handleNext]);

  const handleRate = useCallback((rating: number) => {
    if (callIdRef.current) {
      socket.emit("rate-call", { callId: callIdRef.current, rating });
      showToast(rating >= 4 ? t("videoChat.ratingPositive") : t("videoChat.ratingThanks"), "info");
      setShowRating(false);
    }
  }, [socket]);

  // Spacebar = Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !filtersOpen && !reportOpen && e.target === document.body) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, filtersOpen, reportOpen]);

  return (
    <div className="fixed inset-0 flex flex-col bg-bg-deep">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Remote video */}
        <VideoFeed stream={remoteStream} showPlaceholder={false}>

          <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between z-10">
            <div className="flex flex-col gap-2">
              <StatusPill status={appState} />
              {/* Active filters display */}
              {(filters.country || filters.language || filters.tags.length > 0 || filters.gender) && (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                  {filters.country && (() => {
                    const c = COUNTRIES.find(x => x.code === filters.country);
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-body text-text bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/[0.08]">
                        <img src={`https://flagcdn.com/w40/${filters.country.toLowerCase()}.png`} width={12} height={9} alt="" className="rounded-sm" />
                        {c?.name || filters.country}
                      </span>
                    );
                  })()}
                  {filters.language && (() => {
                    const l = LANGUAGES.find(x => x.code === filters.language);
                    return (
                      <span className="text-[10px] font-body text-text bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/[0.08]">
                        {l?.name || filters.language}
                      </span>
                    );
                  })()}
                  {filters.gender && (
                    <span className="text-[10px] font-body text-text bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/[0.08]">
                      {filters.gender === "male" ? t("account.male") : filters.gender === "female" ? t("account.female") : t("account.other")}
                    </span>
                  )}
                  {filters.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-body text-accent bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-accent/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Partner name */}
              {appState === "connected" && partnerName && (
                <GlassPanel className="px-3 py-1.5 rounded-full">
                  <span className="text-xs font-body font-medium text-text">{partnerName}</span>
                </GlassPanel>
              )}
              {/* Timer */}
              {appState === "connected" && (
                <GlassPanel className="px-3 py-1.5 rounded-full">
                  <span className="text-xs font-mono text-text">{timer.formatted}</span>
                </GlassPanel>
              )}
            </div>
          </div>

          {/* Action buttons on remote video */}
          {appState === "connected" && isAuthenticated && (
            <div className="absolute bottom-3 right-3 z-10 flex gap-2">
              <button onClick={handleAddFriend} title="Add friend"
                className="w-9 h-9 rounded-full backdrop-blur-md bg-black/40 border border-white/[0.06] flex items-center justify-center text-success hover:bg-success/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </button>
              <button onClick={() => setReportOpen(true)} title="Report / Block"
                className="w-9 h-9 rounded-full backdrop-blur-md bg-black/40 border border-white/[0.06] flex items-center justify-center text-danger hover:bg-danger/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            </div>
          )}

          {/* Rating overlay */}
          {showRating && callIdRef.current && isAuthenticated && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-bg/90 backdrop-blur-md border border-white/[0.06] rounded-2xl p-6 text-center">
                <p className="text-sm font-body text-text mb-3">{t("videoChat.rateCall")}</p>
                <div className="flex gap-3">
                  <button onClick={() => handleRate(1)}
                    className="px-6 py-2.5 rounded-xl bg-danger/20 text-danger font-body text-sm font-semibold hover:bg-danger/30 transition-colors active:scale-95">
                    {t("videoChat.bad")}
                  </button>
                  <button onClick={() => handleRate(5)}
                    className="px-6 py-2.5 rounded-xl bg-success/20 text-success font-body text-sm font-semibold hover:bg-success/30 transition-colors active:scale-95">
                    {t("videoChat.good")}
                  </button>
                </div>
                <button onClick={() => setShowRating(false)} className="mt-2 text-xs text-text-dim font-body hover:text-text-secondary">{t("videoChat.skip")}</button>
              </div>
            </div>
          )}

          {appState === "searching" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-2 border-text-dim border-t-accent rounded-full animate-spin" />
                <span className="text-sm text-text-secondary font-body">{t("videoChat.searchingShort")}</span>
              </div>
            </div>
          )}

          {appState === "partner_left" && !showRating && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-bg/80 backdrop-blur-md border border-white/[0.06] rounded-2xl px-8 py-6 text-center max-w-xs">
                <p className="text-lg font-body font-semibold text-text mb-1">{t("videoChat.partnerLeftMessage")}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="w-5 h-5 border-2 border-text-dim border-t-accent rounded-full animate-spin" />
                  <p className="text-text-secondary font-body text-sm">{t("videoChat.autoSearching")}</p>
                </div>
              </div>
            </div>
          )}

          {appState === "disconnected" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-bg/80 backdrop-blur-md border border-white/[0.06] rounded-2xl px-8 py-6 text-center max-w-xs">
                <span className="text-4xl block mb-3" role="img" aria-label="wave">&#x1F44B;</span>
                <p className="text-xl font-body font-bold text-text mb-4">{t("videoChat.chatEndedTitle")}</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-soft text-white font-body text-sm font-semibold shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30 transition-all active:scale-95">
                    {t("videoChat.nextButton")}
                  </button>
                  <Link href="/"
                    className="px-6 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-white/[0.06] text-text font-body text-sm font-semibold transition-colors active:scale-95">
                    {t("videoChat.homeButton")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </VideoFeed>

        {/* Local video */}
        <VideoFeed stream={stream} mirrored muted label={t("videoChat.yourCamera")}>
          <div className="absolute bottom-3 left-3 z-10">
            <GlassPanel className="px-3 py-1 rounded-full">
              <span className="text-[11px] font-body text-text-secondary">
                {user?.name || "Vous"}
              </span>
            </GlassPanel>
          </div>

          {/* Nav menu button */}
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full backdrop-blur-md bg-black/40 border border-white/[0.06] flex items-center justify-center text-text hover:bg-white/10 transition-colors"
              title="Menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-44 bg-surface border border-white/[0.06] rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                  <Link href="/" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
                    </svg>
                    {t("videoChat.home")}
                  </Link>
                  {isAuthenticated ? (
                    <>
                      <Link href="/account" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t("videoChat.myProfile")}
                      </Link>
                      <Link href="/friends" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {t("videoChat.following")}
                      </Link>
                      <Link href="/history" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t("videoChat.history")}
                      </Link>
                      {user?.isAdmin && (
                        <Link href="/admin" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-accent hover:bg-surface-hover transition-colors">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Admin
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      <Link href="/auth/login" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-text-secondary hover:bg-surface-hover hover:text-text transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        {t("welcome.login")}
                      </Link>
                      <Link href="/auth/register" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-accent hover:bg-surface-hover transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        {t("welcome.createAccount")}
                      </Link>
                    </>
                  )}
                  <Link href="/about" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-body text-text-secondary hover:bg-surface-hover hover:text-text transition-colors border-t border-white/[0.06]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t("welcome.about")}
                  </Link>
                </div>
              </>
            )}
          </div>
        </VideoFeed>
      </div>

      {/* Watermark branding */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-40">
        <span className="text-[11px] font-display font-bold text-white drop-shadow-md tracking-wide">Parle-moi</span>
      </div>

      <ControlBar
        micOn={micOn} camOn={camOn}
        onToggleMic={handleToggleMic} onToggleCam={handleToggleCam}
        onNext={handleNext} onStop={handleStop}
        onOpenFilters={() => setFiltersOpen(true)}
        isConnected={connectionStatus === "connected"}
      />

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)}
        currentFilters={filters} onApply={handleApplyFilters}
        userTags={user?.tags} />

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)}
        onReport={handleReport} onBlock={handleBlock}
        partnerName={partnerName} />
    </div>
  );
}
