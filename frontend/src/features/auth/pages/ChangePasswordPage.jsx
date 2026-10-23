import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";

import { changePassword } from "../authApi";
import { changePasswordSchema, passwordRules } from "../schemas";
import { getErrorMessage } from "../../../utils/helpers";
import PasswordField from "../../../components/common/PasswordField";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import PageHeader from "../../../components/common/PageHeader";

export default function ChangePasswordPage() {
  const [success, setSuccess] = useState(null);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPassword = watch("newPassword") || "";

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setSuccess(null);
    setServerError(null);
    try {
      const res = await changePassword({ currentPassword, newPassword });
      setSuccess(res.message || "Password changed successfully");
      reset();
    } catch (err) {
      setServerError(getErrorMessage(err, "Could not change the password"));
    }
  };

  return (
    <div className="max-w-xl">
      <PageHeader title="Change password" subtitle="Use a strong password you don't use anywhere else." />

      <Card>
        {success && (
          <div role="status" className="mb-5 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {serverError && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <PasswordField
            label="Current password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />

          <PasswordField
            label="New password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <ul className="grid gap-1 text-xs sm:grid-cols-2">
            {passwordRules.map((rule) => {
              const ok = rule.test(newPassword);
              return (
                <li key={rule.label} className={`flex items-center gap-1.5 ${ok ? "text-green-600" : "text-slate-400"}`}>
                  {ok ? <CheckCircle2 size={14} /> : <Circle size={14} />} {rule.label}
                </li>
              );
            })}
          </ul>

          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
