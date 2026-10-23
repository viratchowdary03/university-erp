import { createContext, useCallback, useMemo, useRef, useState } from "react";
import Modal from "./Modal";
import Button from "./Button";

export const ConfirmContext = createContext(null);

// confirm({ title, message, confirmLabel, tone: "danger" | "primary" }) -> Promise<boolean>
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setRequest(options);
      }),
    []
  );

  const answer = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setRequest(null);
  };

  const value = useMemo(() => ({ confirm }), [confirm]);
  const danger = request?.tone === "danger";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal open={Boolean(request)} onClose={() => answer(false)} title={request?.title || ""} size="sm">
        <p className="text-sm text-slate-600">{request?.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => answer(false)}>{request?.cancelLabel || "Cancel"}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => answer(true)}>
            {request?.confirmLabel || "Confirm"}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
