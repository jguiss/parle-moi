"use client";

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("parle-moi-token");
}

export function setToken(token: string): void {
  localStorage.setItem("parle-moi-token", token);
}

export function clearToken(): void {
  localStorage.removeItem("parle-moi-token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { email: string; name: string; password: string }) =>
    request<{ token: string; user: UserData }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: UserData }>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),

  verifyEmail: (token: string) =>
    request<{ message: string }>("/api/auth/verify", { method: "POST", body: JSON.stringify({ token }) }),

  me: () =>
    request<{ user: UserData }>("/api/auth/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/api/auth/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),

  // Profile
  updateProfile: (body: Partial<{ name: string; country: string; language: string; gender: string; latitude: number; longitude: number }>) =>
    request<{ message: string }>("/api/users/profile", { method: "PUT", body: JSON.stringify(body) }),

  updateTags: (tags: string[]) =>
    request<{ message: string; tags: string[] }>("/api/users/tags", { method: "PUT", body: JSON.stringify({ tags }) }),

  getTags: () =>
    request<{ tags: string[] }>("/api/users/tags"),

  updateLanguages: (languages: string[]) =>
    request<{ message: string; languages: string[] }>("/api/users/languages", { method: "PUT", body: JSON.stringify({ languages }) }),

  getLanguages: () =>
    request<{ languages: string[] }>("/api/users/languages"),

  // Friends
  getFriends: () =>
    request<{ friends: FriendData[] }>("/api/friends"),

  addFriend: (friendId: string) =>
    request<{ message: string }>(`/api/friends/${friendId}`, { method: "POST" }),

  removeFriend: (friendId: string) =>
    request<{ message: string }>(`/api/friends/${friendId}`, { method: "DELETE" }),

  // Messages
  getMessages: (friendId: string, limit = 50) =>
    request<{ messages: MessageData[] }>(`/api/messages/${friendId}?limit=${limit}`),

  sendMessage: (friendId: string, text: string) =>
    request<{ message: string }>(`/api/messages/${friendId}`, { method: "POST", body: JSON.stringify({ text }) }),

  getUnreadCount: () =>
    request<{ count: number }>("/api/messages/unread/count"),

  // History
  getHistory: (limit = 20, offset = 0) =>
    request<{ calls: CallData[] }>(`/api/history?limit=${limit}&offset=${offset}`),

  rateCall: (callId: number, rating: number) =>
    request<{ message: string }>("/api/history/rate", { method: "POST", body: JSON.stringify({ callId, rating }) }),

  // Reports
  reportUser: (reportedId: string, reason: string) =>
    request<{ message: string }>("/api/reports", { method: "POST", body: JSON.stringify({ reportedId, reason }) }),

  blockUser: (blockedId: string) =>
    request<{ message: string }>("/api/reports/block", { method: "POST", body: JSON.stringify({ blockedId }) }),

  unblockUser: (blockedId: string) =>
    request<{ message: string }>(`/api/reports/block/${blockedId}`, { method: "DELETE" }),

  // Admin
  adminStats: () =>
    request<{ totalUsers: number; disabledUsers: number; totalReports: number; totalCalls: number }>("/api/admin/stats"),

  adminUsers: (page = 1, limit = 20, search = "") =>
    request<{ users: AdminUser[]; total: number; page: number; totalPages: number }>(
      `/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),

  adminReports: (page = 1, limit = 20) =>
    request<{ reports: AdminReport[]; total: number; page: number; totalPages: number }>(
      `/api/admin/reports?page=${page}&limit=${limit}`),

  adminDisableUser: (id: string) =>
    request<{ message: string }>(`/api/admin/users/${id}/disable`, { method: "POST" }),

  adminEnableUser: (id: string) =>
    request<{ message: string }>(`/api/admin/users/${id}/enable`, { method: "POST" }),

  adminDismissReport: (id: number) =>
    request<{ message: string }>(`/api/admin/reports/${id}`, { method: "DELETE" }),
};

export interface UserData {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  reputationScore: number;
  totalRatings?: number;
  streakDays: number;
  country: string | null;
  language: string | null;
  gender: string | null;
  tags?: string[];
  languages?: string[];
  badges?: { type: string; earnedAt: string }[];
  isAdmin?: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  reputationScore: number;
  streakDays: number;
  country: string | null;
  language: string | null;
  gender: string | null;
  isAdmin: boolean;
  disabled: boolean;
  createdAt: string;
}

export interface AdminReport {
  id: number;
  reporterId: string;
  reportedId: string;
  reason: string;
  createdAt: string;
  reporterName: string | null;
  reporterEmail: string | null;
  reportedName: string | null;
  reportedEmail: string | null;
  reportedDisabled: boolean;
}

export interface FriendData {
  friend_id: string;
  name: string;
  reputation_score: number;
  country: string | null;
  created_at: string;
}

export interface MessageData {
  id: number;
  fromUser: string;
  toUser: string;
  text: string;
  read: number;
  createdAt: string;
}

export interface CallData {
  id: number;
  user_a: string;
  user_b: string;
  partner_id: string;
  partner_name: string | null;
  partner_country: string | null;
  partner_language: string | null;
  partner_tags: string[];
  is_following: number;
  started_at: string;
  duration: number;
  rating_a: number | null;
  rating_b: number | null;
}
