"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, AdminUser, AdminReport } from "@/lib/api";
import { CountryFlag } from "@/components/CountryFlag";
import Link from "next/link";

type Tab = "users" | "reports";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("users");
  const [stats, setStats] = useState({ totalUsers: 0, disabledUsers: 0, totalReports: 0, totalCalls: 0 });

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Reports state
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);

  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push("/");
    }
  }, [loading, user, router]);

  const loadStats = useCallback(async () => {
    try {
      const s = await api.adminStats();
      setStats(s);
    } catch { /* silent */ }
  }, []);

  const loadUsers = useCallback(async (page: number, search: string) => {
    try {
      const r = await api.adminUsers(page, 20, search);
      setUsers(r.users);
      setUsersTotalPages(r.totalPages);
    } catch { /* silent */ }
  }, []);

  const loadReports = useCallback(async (page: number) => {
    try {
      const r = await api.adminReports(page, 20);
      setReports(r.reports);
      setReportsTotalPages(r.totalPages);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      loadStats();
      loadUsers(1, "");
      loadReports(1);
    }
  }, [user, loadStats, loadUsers, loadReports]);

  const handleSearch = () => {
    setUsersSearch(searchInput);
    setUsersPage(1);
    loadUsers(1, searchInput);
  };

  const handleUsersPageChange = (p: number) => {
    setUsersPage(p);
    loadUsers(p, usersSearch);
  };

  const handleReportsPageChange = (p: number) => {
    setReportsPage(p);
    loadReports(p);
  };

  const toggleDisable = async (u: AdminUser) => {
    try {
      if (u.disabled) {
        await api.adminEnableUser(u.id);
      } else {
        await api.adminDisableUser(u.id);
      }
      loadUsers(usersPage, usersSearch);
      loadStats();
    } catch { /* silent */ }
  };

  const dismissReport = async (id: number) => {
    try {
      await api.adminDismissReport(id);
      loadReports(reportsPage);
      loadStats();
    } catch { /* silent */ }
  };

  const disableReportedUser = async (reportedId: string) => {
    try {
      await api.adminDisableUser(reportedId);
      loadReports(reportsPage);
      loadUsers(usersPage, usersSearch);
      loadStats();
    } catch { /* silent */ }
  };

  if (loading || !user?.isAdmin) return <div className="min-h-screen bg-bg-deep" />;

  return (
    <div className="min-h-screen bg-bg-deep px-4 py-8 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="text-sm text-text-dim hover:text-text-secondary font-body mb-4 inline-block">&larr; Retour au chat</Link>

        <h1 className="text-2xl font-display font-bold text-text mb-6">Tableau de bord admin</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Utilisateurs" value={stats.totalUsers} />
          <StatCard label="Désactivés" value={stats.disabledUsers} color="text-danger" />
          <StatCard label="Signalements" value={stats.totalReports} color="text-warning" />
          <StatCard label="Appels totaux" value={stats.totalCalls} color="text-accent" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-surface rounded-xl p-1">
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>Utilisateurs ({stats.totalUsers})</TabButton>
          <TabButton active={tab === "reports"} onClick={() => setTab("reports")}>Signalements ({stats.totalReports})</TabButton>
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Rechercher par nom ou email..."
                className="flex-1 bg-surface border border-surface-hover rounded-xl px-4 py-2.5 text-sm text-text font-body placeholder:text-text-dim focus:outline-none focus:border-accent/50"
              />
              <button onClick={handleSearch}
                className="px-4 py-2.5 bg-accent text-white text-sm font-body font-semibold rounded-xl hover:bg-accent/90 transition-colors">
                Rechercher
              </button>
            </div>

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className={`bg-surface rounded-xl p-4 flex items-center gap-3 ${u.disabled ? "opacity-50" : ""}`}>
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-body font-semibold text-accent shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-body text-text truncate font-medium">{u.name}</p>
                      {u.isAdmin && <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-full font-body">Admin</span>}
                      {u.disabled && <span className="text-[10px] px-1.5 py-0.5 bg-danger/20 text-danger rounded-full font-body">Disabled</span>}
                    </div>
                    <p className="text-[11px] font-body text-text-dim truncate">{u.email}</p>
                    <p className="text-[11px] font-body text-text-dim">
                      Rep: {u.reputationScore.toFixed(1)} &middot; Streak: {u.streakDays}d
                      {u.country && <> &middot; <CountryFlag code={u.country} size={12} /> {u.country}</>}
                      {" "}&middot; {formatDate(u.createdAt)}
                    </p>
                  </div>
                  {!u.isAdmin && (
                    <button
                      onClick={() => toggleDisable(u)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-body font-medium rounded-lg transition-colors ${
                        u.disabled
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-danger/10 text-danger hover:bg-danger/20"
                      }`}
                    >
                      {u.disabled ? "Activer" : "Désactiver"}
                    </button>
                  )}
                </div>
              ))}

              {users.length === 0 && (
                <p className="text-text-dim font-body text-sm text-center py-8">Aucun utilisateur trouvé</p>
              )}
            </div>

            <Pagination page={usersPage} totalPages={usersTotalPages} onChange={handleUsersPageChange} />
          </div>
        )}

        {/* Reports Tab */}
        {tab === "reports" && (
          <div>
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="bg-surface rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-xs text-warning shrink-0">!</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-text">
                        <span className="text-text-secondary">{r.reporterName || "Unknown"}</span>
                        {" a signalé "}
                        <span className="text-accent font-medium">{r.reportedName || "Unknown"}</span>
                        {r.reportedDisabled && <span className="text-[10px] ml-1 px-1.5 py-0.5 bg-danger/20 text-danger rounded-full font-body">Disabled</span>}
                      </p>
                      <p className="text-xs font-body text-text-dim mt-1">{r.reason}</p>
                      <p className="text-[11px] font-body text-text-dim mt-1">{formatDate(r.createdAt)}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!r.reportedDisabled && (
                        <button
                          onClick={() => disableReportedUser(r.reportedId)}
                          className="px-3 py-1.5 text-xs font-body font-medium rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                        >
                          Désactiver le compte
                        </button>
                      )}
                      <button
                        onClick={() => dismissReport(r.id)}
                        className="px-3 py-1.5 text-xs font-body font-medium rounded-lg bg-surface-hover text-text-secondary hover:text-text transition-colors"
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {reports.length === 0 && (
                <p className="text-text-dim font-body text-sm text-center py-8">Aucun signalement</p>
              )}
            </div>

            <Pagination page={reportsPage} totalPages={reportsTotalPages} onChange={handleReportsPageChange} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-surface rounded-xl p-4 text-center">
      <p className={`text-2xl font-display font-bold ${color || "text-text"}`}>{value}</p>
      <p className="text-[11px] font-body text-text-dim mt-1">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-body font-medium rounded-lg transition-colors ${
        active ? "bg-accent text-white" : "text-text-secondary hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-xs font-body rounded-lg bg-surface text-text-secondary hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Précédent
      </button>
      <span className="text-xs font-body text-text-dim">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-xs font-body rounded-lg bg-surface text-text-secondary hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Suivant
      </button>
    </div>
  );
}
