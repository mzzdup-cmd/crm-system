import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const ToastContext =
  createContext(null);

let toastId = 0;

export function ToastProvider({
  children,
}) {
  const [toasts, setToasts] =
    useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) =>
      current.filter(
        (toast) => toast.id !== id
      )
    );
  }, []);

  const push = useCallback(
    (message, type = "info") => {
      const id = ++toastId;

      setToasts((current) => [
        ...current,
        { id, message, type },
      ]);

      window.setTimeout(() => {
        dismiss(id);
      }, 4000);

      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      success: (message) =>
        push(message, "success"),
      error: (message) =>
        push(message, "error"),
      info: (message) =>
        push(message, "info"),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        className="
          fixed bottom-4 right-4 z-[100]
          flex flex-col gap-2
          max-w-sm w-full pointer-events-none
        "
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto
              px-4 py-3 rounded-xl shadow-lg
              text-sm font-medium animate-fade-in
              ${
                toast.type === "success"
                  ? "bg-brand text-brand-fg"
                  : toast.type === "error"
                    ? "bg-red-600 text-white"
                    : "bg-surface-raised text-white border border-neutral-700"
              }
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context =
    useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used within ToastProvider"
    );
  }

  return context;
}
