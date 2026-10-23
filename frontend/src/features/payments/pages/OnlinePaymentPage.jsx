import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import PageHeader from "../../../components/common/PageHeader";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import InputField from "../../../components/common/InputField";
import Select from "../../../components/common/Select";
import QueryState from "../../../components/common/PageLoader";
import { useData, useSend } from "../../../api/resource";
import { formatMoney, formatIso, getErrorMessage } from "../../../utils/helpers";

export default function OnlinePaymentPage() {
  const { structureId } = useParams();
  const fees = useData(["fees", "me"], "/fees/me");
  const gateway = useData(["payments", "gateway"], "/payments/gateway");
  return (
    <>
      <Link to="/fees" className="mb-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"><ArrowLeft size={15} /> My fees</Link>
      <PageHeader title="Pay fees online" />
      <QueryState query={fees}>
        {({ items }) => {
          const fee = items.find((f) => f.id === structureId);
          if (!fee || fee.balance === 0) return <Card><p className="py-8 text-center text-sm text-slate-500">This fee is already paid, or does not apply to you.</p></Card>;
          if (gateway.data && !gateway.data.provider) {
            return <Card><p className="py-8 text-center text-sm text-slate-600">Online payment is not switched on yet. Please pay at the accounts office.</p></Card>;
          }
          return <Checkout fee={fee} sandbox={Boolean(gateway.data?.sandbox)} />;
        }}
      </QueryState>
    </>
  );
}

function Checkout({ fee, sandbox }) {
  const navigate = useNavigate();
  const send = useSend();
  const [amount, setAmount] = useState(fee.balance);
  const [method, setMethod] = useState("UPI");
  const [error, setError] = useState(null);

  const pay = async (outcome) => {
    setError(null);
    try {
      const order = await send.mutateAsync({ method: "post", url: "/payments/orders", body: { structureId: fee.id, amount: Number(amount) } });
      await send.mutateAsync({ method: "post", url: `/payments/orders/${order.orderId}/confirm`, body: { method, outcome } });
      navigate(`/payments/status/${order.orderId}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Could not complete the payment"));
    }
  };

  return (
    <Card className="max-w-xl">
      {sandbox && (
        <div className="mb-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <ShieldAlert size={18} className="mt-0.5 shrink-0" />
          <span>Test checkout: no real money moves. A real payment gateway has to be connected before going live.</span>
        </div>
      )}
      <h2 className="font-semibold text-slate-900">{fee.title}</h2>
      <p className="mb-5 text-sm text-slate-500">Due {formatIso(fee.dueDate)} - balance {formatMoney(fee.balance)}</p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <InputField label="Amount (₹)" type="number" min="1" max={fee.balance} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select label="Pay using" value={method} onChange={(e) => setMethod(e.target.value)}><option>UPI</option><option>Card</option><option>Net Banking</option></Select>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => pay("success")} loading={send.isPending} disabled={!(Number(amount) > 0 && Number(amount) <= fee.balance)}>Pay {formatMoney(Number(amount) || 0)}</Button>
        {sandbox && <Button variant="secondary" onClick={() => pay("failure")} disabled={send.isPending}>Simulate a failed payment</Button>}
      </div>
    </Card>
  );
}
