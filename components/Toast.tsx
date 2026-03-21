"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ToastMessage {
  id: number;
  text: string;
  type: "info" | "success" | "warning" | "error";
}

let toastId = 0;
let addToastFn: ((text: string, type?: ToastMessage["type"]) => void) | null = null;

export function showToast(text: string, type: ToastMessage["type"] = "info") {
  addToastFn?.(text, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((text: string, type: ToastMessage["type"] = "info") => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, text, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 3000);

    timersRef.current.set(id, timer);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, [addToast]);

  const typeColors: Record<ToastMessage["type"], string> = {
    info: "bg-surface border-white/[0.06]",
    success: "bg-surface border-success/30",
    warning: "bg-surface border-warning/30",
    error: "bg-surface border-danger/30",
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-toastIn px-4 py-2.5 rounded-xl border backdrop-blur-md text-sm font-body text-text shadow-lg ${typeColors[toast.type]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
