"use client";

import * as React from "react";

type ToastVariant = "default" | "destructive" | "success" | "warning";

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast } = context;

  return {
    ...context,
    toast: addToast,
    success: (message: string, title?: string) =>
      addToast({
        variant: "success",
        description: message,
        ...(title && { title }),
      }),
    error: (message: string, title?: string) =>
      addToast({
        variant: "destructive",
        description: message,
        ...(title && { title }),
      }),
    warning: (message: string, title?: string) =>
      addToast({
        variant: "warning",
        description: message,
        ...(title && { title }),
      }),
    info: (message: string, title?: string) =>
      addToast({
        variant: "default",
        description: message,
        ...(title && { title }),
      }),
  };
}
