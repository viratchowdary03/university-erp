import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import Card from "../../../components/common/Card";
import QueryState from "../../../components/common/PageLoader";
import { useData } from "../../../api/resource";
import { formatMoney } from "../../../utils/helpers";

export default function PaymentStatusPage() {
  const { orderId } = useParams();
  const query = useData(["payments", "order", orderId], `/payments/orders/${orderId}`);
  return (
    <QueryState query={query}>
      {(o) => (
        <Card className="mx-auto max-w-md text-center">
          {o.status === "paid" ? <CheckCircle2 className="mx-auto text-emerald-500" size={52} /> : <XCircle className="mx-auto text-red-500" size={52} />}
          <h1 className="mt-3 text-xl font-semibold text-slate-900">{o.status === "paid" ? "Payment successful" : "Payment failed"}</h1>
          <p className="mt-1 text-sm text-slate-500">{o.feeTitle}</p>
          <p className="my-3 text-3xl font-bold text-slate-900">{formatMoney(o.amount)}</p>
          <p className="text-xs text-slate-400">Order {o.orderId}{o.receiptNo ? ` - Receipt ${o.receiptNo}` : ""}</p>
          {o.failureReason && <p className="mt-2 text-sm text-red-600">{o.failureReason}</p>}
          <Link to="/fees" className="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Back to my fees</Link>
        </Card>
      )}
    </QueryState>
  );
}
