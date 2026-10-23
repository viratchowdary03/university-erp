import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertCircle, GraduationCap, BookOpenCheck, Building2, ScrollText, ClipboardList,
  ShieldCheck, Wallet, Library, CheckCircle2, Circle, Info,
} from "lucide-react";

import { registerUser } from "../authApi";
import { buildRegisterSchema, passwordRules } from "../schemas";
import { ROLE_FIELDS, ROLE_CHOICES } from "../../../config/roleFields";
import { ROLES } from "../../../config/roles";
import { approverNote } from "../../../config/permissions";
import { getErrorMessage } from "../../../utils/helpers";
import Logo from "../../../components/common/Logo";
import InputField from "../../../components/common/InputField";
import PasswordField from "../../../components/common/PasswordField";
import Button from "../../../components/common/Button";
import RoleFields from "../components/RoleFields";

const ROLE_ICONS = {
  [ROLES.STUDENT]: GraduationCap,
  [ROLES.FACULTY]: BookOpenCheck,
  [ROLES.HOD]: Building2,
  [ROLES.REGISTRAR]: ScrollText,
  [ROLES.ADMIN]: ClipboardList,
  [ROLES.SUPER_ADMIN]: ShieldCheck,
  [ROLES.ACCOUNTANT]: Wallet,
  [ROLES.LIBRARIAN]: Library,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    // The questions change with the role, so the rules are rebuilt for the chosen role
    resolver: (values, context, options) =>
      zodResolver(buildRegisterSchema(values.role))(values, context, options),
    shouldUnregister: true, // answers for a role you switched away from are dropped
    defaultValues: { role: ROLES.STUDENT, name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const role = watch("role");
  const schoolCode = watch("school");
  const password = watch("password") || "";

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async ({ confirmPassword, ...values }) => {
    setServerError(null);
    try {
      const payload = { ...values, email: values.email.trim().toLowerCase() };
      await registerUser(payload);
      navigate("/verify-otp", { state: { email: payload.email } });
    } catch (err) {
      setServerError(getErrorMessage(err, "Could not create the account"));
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4 sm:items-center">
      <div className="my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6">
          <Logo />
          <h1 className="mt-5 text-2xl font-semibold text-slate-900">Request an account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Choose your role and fill in the details for it. We will email a 6-digit code to verify your address.
          </p>
        </div>

        {serverError && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">I am registering as</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ROLE_CHOICES.map(({ value, label, hint }) => {
                const Icon = ROLE_ICONS[value];
                return (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" value={value} className="peer sr-only" {...register("role")} />
                    <div className="h-full rounded-lg border border-slate-300 p-3 transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100">
                      <span className="mb-2 inline-flex rounded-md bg-brand-100 p-1.5 text-brand-600"><Icon size={16} /></span>
                      <span className="block text-sm font-semibold text-slate-800">{label}</span>
                      <span className="block text-xs text-slate-500">{hint}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>{approverNote(role)}. You can sign in once your request is approved.</span>
            </p>
          </fieldset>

          <section aria-labelledby="basic-details">
            <h2 id="basic-details" className="mb-3 text-sm font-semibold text-slate-800">Your details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <InputField label="Full name" autoComplete="name" placeholder="Your full name"
                error={errors.name?.message} {...register("name")} />
              <InputField label="Email" type="email" autoComplete="email" placeholder="you@example.com"
                error={errors.email?.message} {...register("email")} />
              <InputField label="Phone (optional)" type="tel" autoComplete="tel" placeholder="+91 98765 43210"
                error={errors.phone?.message} {...register("phone")} />
            </div>
          </section>

          <section aria-labelledby="role-details">
            <h2 id="role-details" className="mb-3 text-sm font-semibold text-slate-800">
              Details for {ROLE_CHOICES.find((r) => r.value === role)?.label}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <RoleFields
                fields={ROLE_FIELDS[role] || []}
                register={register}
                errors={errors}
                schoolCode={schoolCode}
                setValue={setValue}
              />
            </div>
          </section>

          <section aria-labelledby="password-details">
            <h2 id="password-details" className="mb-3 text-sm font-semibold text-slate-800">Password</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <PasswordField label="Password" autoComplete="new-password" error={errors.password?.message}
                {...register("password")} />
              <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirmPassword?.message}
                {...register("confirmPassword")} />
            </div>
            <ul className="mt-3 grid gap-1 text-xs sm:grid-cols-4">
              {passwordRules.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? "text-green-600" : "text-slate-400"}`}>
                    {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />} {rule.label}
                  </li>
                );
              })}
            </ul>
          </section>

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Sending code..." : "Send request and verification code"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
