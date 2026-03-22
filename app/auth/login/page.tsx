"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const handleSubmit = async (data: { email: string; password: string }) => {
    setError(null);
    try {
      await login(data.email, data.password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-display font-extrabold bg-gradient-to-r from-accent to-accent-soft bg-clip-text text-transparent mb-2">
          {t("login.welcome")}
        </h1>
        <p className="text-sm text-text-secondary font-body">{t("login.subtitle")}</p>
      </div>

      <AuthForm mode="login" onSubmit={handleSubmit} error={error} />

      <p className="mt-6 text-sm text-text-dim font-body">
        {t("login.noAccount")}{" "}
        <Link href="/auth/register" className="text-accent hover:underline">{t("login.createAccount")}</Link>
      </p>

      <Link href="/" className="mt-4 text-xs text-text-dim hover:text-text-secondary transition-colors">
        {t("login.continueWithout")}
      </Link>
    </div>
  );
}
