"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (data: { email: string; name?: string; password: string }) => {
    setError(null);
    try {
      await register(data.email, data.name || "", data.password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-display font-extrabold bg-gradient-to-r from-accent to-accent-soft bg-clip-text text-transparent mb-2">
          Créer un compte
        </h1>
        <p className="text-sm text-text-secondary font-body">Rejoignez Parle-moi et commencez à vous connecter</p>
      </div>

      <AuthForm mode="register" onSubmit={handleSubmit} error={error} />

      <p className="mt-6 text-sm text-text-dim font-body">
        Déjà un compte ?{" "}
        <Link href="/auth/login" className="text-accent hover:underline">Se connecter</Link>
      </p>

      <Link href="/" className="mt-4 text-xs text-text-dim hover:text-text-secondary transition-colors">
        Continuer sans compte
      </Link>
    </div>
  );
}
