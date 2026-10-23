import { Link } from "react-router-dom";

export default function UnauthorizedPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-3xl font-bold">403</h1>
      <p className="mt-2 text-slate-500">You don't have permission to view this page.</p>
      <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
