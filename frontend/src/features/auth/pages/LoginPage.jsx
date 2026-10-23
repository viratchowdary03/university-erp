import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, ShieldCheck, BookOpen, BarChart3 } from "lucide-react";

import { login, clearAuthError } from "../authSlice";
import { loginSchema } from "../schemas";
import { ROLES, ROLE_LABELS } from "../../../config/roles";
import { SCHOOLS } from "../../../config/schools";
import InputField from "../../../components/common/InputField";
import PasswordField from "../../../components/common/PasswordField";
import Button from "../../../components/common/Button";
import Logo from "../../../components/common/Logo";
import { BRAND } from "../../../config/brand";

const MOCK = import.meta.env.VITE_MOCK_AUTH === "true";

const HIGHLIGHTS = [
  { icon: BookOpen, text: "Attendance, timetable and results in one place" },
  { icon: BarChart3, text: "Role-based dashboards for every user" },
  { icon: ShieldCheck, text: "Secure, role-based access control" },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user, error } = useSelector((state) => state.auth);

  // Send the user back to the page they originally tried to open
  const redirectTo = location.state?.from?.pathname || "/";
  // Message coming from registration, e.g. "Email verified. You can sign in now"
  const flash = location.state?.message;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", role: ROLES.SUPER_ADMIN, school: "ENG" },
  });

  // In demo mode, people who belong to one school can be tried out in any school
  const demoRole = watch("role");
  const needsSchool = [ROLES.HOD, ROLES.FACULTY, ROLES.STUDENT].includes(demoRole);

  // Clear any old error when leaving the page
  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const onSubmit = async (values) => {
    dispatch(clearAuthError());
    await dispatch(login(values));
    // On success, `user` is set in the store and <Navigate> below redirects.
  };

  if (user) return <Navigate to={redirectTo} replace />;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Branding panel (hidden on small screens) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative"><Logo light /></div>

        <div className="relative">
          <h2 className="max-w-sm text-4xl font-bold leading-tight">{BRAND.tagline}</h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-100">
                <span className="rounded-lg bg-white/10 p-2">
                  <Icon size={18} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-brand-200">© {new Date().getFullYear()} {BRAND.name}</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>

          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue.</p>

          {flash && !error && (
            <div
              role="status"
              className="mt-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{flash}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-5">
            {MOCK && (
              <div>
                <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Login as (demo mode)
                </label>
                <select
                  id="role"
                  {...register("role")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  {Object.values(ROLES).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {MOCK && needsSchool && (
              <div>
                <label htmlFor="school" className="mb-1.5 block text-sm font-medium text-slate-700">
                  School (demo mode)
                </label>
                <select
                  id="school"
                  {...register("school")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                >
                  {SCHOOLS.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <InputField
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="you@university.edu"
              error={errors.email?.message}
              {...register("email")}
            />

            <PasswordField
              label="Password"
              autoComplete="current-password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
            />

            <div className="-mt-2 text-right">
              <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to {BRAND.name}?{" "}
            <Link to="/register" className="font-medium text-brand-600 hover:underline">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-slate-500">
            Want to join the university?{" "}
            <Link to="/apply" className="font-medium text-brand-600 hover:underline">
              Apply for admission
            </Link>
          </p>

          {MOCK && (
            <p className="mt-6 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
              Demo mode is on. Pick a role to sign in as a sample person. Email and password are ignored.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
