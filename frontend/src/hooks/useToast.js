import { useContext } from "react";
import { ToastContext } from "../components/common/Toast";

// const toast = useToast();  toast.success("Saved");  toast.error("Could not save");
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
