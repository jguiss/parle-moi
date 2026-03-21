"use client";

import { useState, FormEvent } from "react";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: { email: string; name?: string; password: string }) => Promise<void>;
  error: string | null;
}

export function AuthForm({ mode, onSubmit, error }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ email, name: mode === "register" ? name : undefined, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      {mode === "register" && (
        <div>
          <label className="block text-xs text-text-secondary font-body mb-1.5">Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
            placeholder="Votre nom"
          />
        </div>
      )}

      <div>
        <label className="block text-xs text-text-secondary font-body mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-xs text-text-secondary font-body mb-1.5">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-3 bg-surface border border-white/[0.06] rounded-xl text-text font-body text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
          placeholder={mode === "register" ? "8 caractères minimum" : "Votre mot de passe"}
        />
      </div>

      {error && (
        <p className="text-sm text-danger font-body bg-danger/10 px-3 py-2 rounded-lg">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-soft text-white font-body font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50"
      >
        {loading ? "..." : mode === "login" ? "Se connecter" : "Créer un compte"}
      </button>
    </form>
  );
}
