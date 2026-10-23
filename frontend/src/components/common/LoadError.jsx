import { AlertCircle } from "lucide-react";
import Button from "./Button";
import { getErrorMessage } from "../../utils/helpers";

export default function LoadError({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mx-auto mb-2 text-red-500" size={28} />
      <p className="text-sm font-medium text-red-800">This page could not be loaded</p>
      <p className="mt-1 text-xs text-red-700">{getErrorMessage(error, "Please try again")}</p>
      {onRetry && <Button variant="secondary" className="mt-4" onClick={() => onRetry()}>Try again</Button>}
    </div>
  );
}
