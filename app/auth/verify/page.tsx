"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Link from "next/link";
import { Suspense } from "react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Aucun jeton de vérification fourni");
      return;
    }

    api.verifyEmail(token)
      .then(() => {
        setStatus("success");
        setMessage("Votre email a été vérifié ! Vous pouvez maintenant utiliser toutes les fonctionnalités.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-bg-deep flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-sm">
        {status === "loading" && (
          <>
            <div className="w-10 h-10 border-2 border-text-dim border-t-accent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-secondary font-body">Vérification de votre email...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-text mb-2">Email vérifié</h1>
            <p className="text-text-secondary font-body text-sm mb-6">{message}</p>
            <Link href="/" className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-soft text-white font-body font-semibold text-sm">
              Commencer à chatter
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-text mb-2">Échec de la vérification</h1>
            <p className="text-text-secondary font-body text-sm mb-6">{message}</p>
            <Link href="/auth/login" className="text-accent hover:underline text-sm font-body">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-deep" />}>
      <VerifyContent />
    </Suspense>
  );
}
