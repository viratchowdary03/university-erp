import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, MailCheck, ArrowLeft } from "lucide-react";
import Logo from "../../../components/common/Logo";
import InputField from "../../../components/common/InputField";
import Button from "../../../components/common/Button";
import { forgotPassword, resetPassword } from "../authApi";
import { passwordRules } from "../schemas";
import { getErrorMessage } from "../../../utils/helpers";
import { useToast } from "../../../hooks/useToast";

// Step 1: enter the email and get a 6-digit code. Step 2: enter the code and a new password.
export default function ForgotPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const run = async (action) => {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again"));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e) => {
    e.preventDefault();
    run(async () => {
      await forgotPassword(email.trim());
      setStep(2);
    });
  };

  const reset = (e) => {
    e.preventDefault();
    const failed = passwordRules.find((r) => !r.test(password));
    if (failed) return setError(`The new password needs: ${failed.label.toLowerCase()}`);
    return run(async () => {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: password });
      toast.success("Password changed. Please sign in");
      navigate("/login", { replace: true });
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-5 flex justify-center"><Logo /></div>
          {step === 2 && (
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600"><MailCheck size={26} /></div>
          )}
          <h1 className="text-xl font-semibold text-slate-900">{step === 1 ? "Forgot your password?" : "Check your email"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {step === 1
              ? "Enter your email and we will send you a 6-digit code."
              : `If an account exists for ${email}, a code has been sent. Enter it below with your new password.`}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={sendCode} className="space-y-5">
            <InputField label="Email" type="email" autoComplete="email" autoFocus required placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" loading={busy} className="w-full">{busy ? "Sending..." : "Send code"}</Button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-5">
            <InputField label="6-digit code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
            <InputField label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul className="space-y-0.5 text-xs">
              {passwordRules.map((r) => (
                <li key={r.label} className={r.test(password) ? "text-emerald-600" : "text-slate-400"}>{r.test(password) ? "✓" : "•"} {r.label}</li>
              ))}
            </ul>
            <Button type="submit" loading={busy} className="w-full">{busy ? "Saving..." : "Change password"}</Button>
            <button type="button" onClick={() => { setStep(1); setError(null); }} className="block w-full text-center text-sm text-slate-500 hover:underline">Use a different email or get a new code</button>
          </form>
        )}

        <Link to="/login" className="mt-6 flex items-center justify-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
