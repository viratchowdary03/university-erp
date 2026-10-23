import { useContext } from "react";
import { ConfirmContext } from "../components/common/ConfirmDialog";

// const confirm = useConfirm();
// if (await confirm({ title: "Delete?", message: "...", tone: "danger" })) { ... }
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}
