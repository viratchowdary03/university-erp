import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, CheckCircle2, MailCheck } from "lucide-react";

import { verifyOtp, resendOtp, DEMO_OTP } from "../authApi";
import { otpSchema } from "../schemas";
import { getErrorMessage } from "../../../utils/helpers";
import Logo from "../../../components/common/Logo";
import InputField from "../../../components/common/InputField";
import Button from "../../../components/common/Button";

const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";
const RESEND_SECONDS = 60;

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [serverError, setServerError] = useState(null);
  const [info, setInfo] = useState(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Opened directly without registering first
  if (!email) return <Navigate to="/register" replace />;

  const onSubmit = async ({ otp }) => {
    setServerError(null);
    setInfo(null);
    try {
      const res = await verifyOtp({ email, otp });
      navigate("/login", { replace: true, state: { message: res.message } });
    } catch (err) {
      setServerError(getErrorMessage(err, "Could not verify the code"));
    }
  };

  const onResend = async () => {
    setServerError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendOtp(email);
      setInfo("A new code has been sent. Check your inbox.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setServerError(getErrorMessage(err, "Could not send a new code"));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-5 flex justify-center"><Logo /></div>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
            <MailCheck size={26} />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Verify your email</h1>
          <p className="mt-1 text-sm text-slate-500">
            We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>.
            It expires in 10 minutes.
          </p>
        </div>

        {MOCK && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
            Demo mode: no email is sent. Use the code <strong>{DEMO_OTP}</strong>.
          </p>
        )}

        {serverError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}
        {info && (
          <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <InputField
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="------"
            className="text-center text-2xl font-semibold tracking-[0.5em]"
            error={errors.otp?.message}
            {...register("otp", {
              onChange: (e) => {
                e.target.value = e.target.value.replace(/\D/g, "");
              },
            })}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Verifying..." : "Verify email"}
          </Button>
        </form>

        <div className="mt-5 text-center text-sm text-slate-500">
          Did not get the code?{" "}
          {cooldown > 0 ? (
            <span>Resend in {cooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              className="font-medium text-brand-600 hover:underline disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        <Link to="/register" className="mt-4 block text-center text-sm font-medium text-slate-500 hover:text-brand-600">
          Use a different email
        </Link>
      </div>
    </div>
  );
}
