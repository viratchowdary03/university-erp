import { Download } from "lucide-react";
import { downloadFile } from "../../../api/resource";
import { useToast } from "../../../hooks/useToast";
import { getErrorMessage } from "../../../utils/helpers";

export default function ReceiptButton({ payment }) {
  const toast = useToast();
  return (
    <button
      type="button"
      title="Download receipt"
      aria-label={`Download receipt ${payment.receiptNo}`}
      onClick={() => downloadFile(`/fees/payments/${payment.id}/receipt`, `${payment.receiptNo}.pdf`).catch((e) => toast.error(getErrorMessage(e)))}
      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
    >
      <Download size={16} />
    </button>
  );
}
