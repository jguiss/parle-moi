"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { api, FriendData, MessageData } from "@/lib/api";
import { COUNTRIES } from "@/data/countries";
import Link from "next/link";

export default function FriendsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push("/auth/login");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      api.getFriends().then((r) => setFriends(r.friends)).catch(() => {});
    }
  }, [isAuthenticated]);

  const loadMessages = useCallback(async (friend: FriendData) => {
    setSelectedFriend(friend);
    try {
      const r = await api.getMessages(friend.friend_id);
      setMessages(r.messages);
    } catch {
      setMessages([]);
    }
  }, []);

  const sendMsg = async () => {
    if (!selectedFriend || !messageText.trim()) return;
    setSending(true);
    try {
      await api.sendMessage(selectedFriend.friend_id, messageText.trim());
      setMessageText("");
      const r = await api.getMessages(selectedFriend.friend_id);
      setMessages(r.messages);
    } catch { /* silent */ }
    setSending(false);
  };

  if (loading || !user) return <div className="min-h-screen bg-bg-deep" />;

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col lg:flex-row">
      {/* Friends list */}
      <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/[0.06] flex flex-col">
        <div className="p-4 border-b border-white/[0.06]">
          <Link href="/" className="text-xs text-text-dim hover:text-text-secondary font-body">&larr; {t("common.back")}</Link>
          <h1 className="text-lg font-display font-bold text-text mt-2">{t("friends.title")}</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <p className="p-4 text-sm text-text-dim font-body">{t("friends.noFriends")}</p>
          ) : (
            friends.map((f) => (
              <button key={f.friend_id} onClick={() => loadMessages(f)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors ${
                  selectedFriend?.friend_id === f.friend_id ? "bg-surface" : ""}`}>
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-body font-semibold text-accent">
                  {f.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-text truncate">{f.name}</p>
                  <p className="text-[11px] font-body text-text-dim flex items-center gap-1">
                    {f.country && (
                      <img src={`https://flagcdn.com/w40/${f.country.toLowerCase()}.png`} width={14} height={10} alt="" className="inline-block rounded-sm" />
                    )}
                    {f.country ? (COUNTRIES.find(c => c.code.toLowerCase() === f.country!.toLowerCase())?.name || f.country) : t("friends.unknown")}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedFriend ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-dim font-body text-sm">{t("friends.selectFriend")}</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-sm font-body font-semibold text-text">{selectedFriend.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.fromUser === user.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm font-body ${
                    m.fromUser === user.id
                      ? "bg-accent text-white rounded-br-sm"
                      : "bg-surface text-text rounded-bl-sm"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-white/[0.06] flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMsg()}
                placeholder={t("friends.messagePlaceholder")}
                maxLength={2000}
                className="flex-1 px-4 py-2.5 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm focus:outline-none focus:border-accent/50"
              />
              <button onClick={sendMsg} disabled={sending || !messageText.trim()}
                className="px-4 py-2.5 bg-accent rounded-xl text-white text-sm font-body font-semibold disabled:opacity-50 transition-all active:scale-95">
                {t("common.send")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
