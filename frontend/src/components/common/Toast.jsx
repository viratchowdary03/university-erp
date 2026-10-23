import { createContext, useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export const ToastContext = createContext(null);

const STYLE = {
  success: { box: "border-green-200 bg-green-50 text-green-800", icon: CheckCircle2 },
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: AlertCircle },
  info: { box: "border-brand-200 bg-brand-50 text-brand-800", icon: Info },
};

const VISIBLE_MS = 4500;
const MAX_TOASTS = 4;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), { id, type, message }]);
      setTimeout(() => dismiss(id), VISIBLE_MS);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map(({ id, type, message }) => {
          const { box, icon: Icon } = STYLE[type];
          return (
            <div
              key={id}
              role={type === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg ${box}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1">{message}</p>
              <button type="button" onClick={() => dismiss(id)} aria-label="Dismiss" className="shrink-0 opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
