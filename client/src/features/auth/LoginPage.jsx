import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { loginSchema } from "./authSchemas.js";
import { useAuth } from "./useAuth.js";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const from = location.state?.from?.pathname || "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err.message || "Invalid credentials. Please verify and try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-soc-dark px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-soc-border bg-soc-surface text-brand-primary shadow-warm-glow">
            <Shield className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
            AI CyberShield SOC
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-soc-muted">
            Intelligent Threat Analysis &amp; Detection Platform
          </p>
        </div>

        <div className="rounded-xl border border-soc-border bg-soc-surface p-6 shadow-2xl sm:p-8">
          <h2 className="text-base font-semibold text-stone-100">Sign in to console</h2>
          <p className="mt-1 text-xs text-soc-muted">
            Enter your credentials to access the real-time security dashboard.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-md border border-rose-900/50 bg-rose-950/30 p-3 text-xs text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="analyst@cybershield.local"
              error={errors.email?.message}
              startAdornment={<Mail className="h-4 w-4" aria-hidden="true" />}
              {...register("email")}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••••"
              error={errors.password?.message}
              startAdornment={<Lock className="h-4 w-4" aria-hidden="true" />}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="rounded p-1 text-stone-400 hover:text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              }
              {...register("password")}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 border-t border-soc-border/60 pt-4 text-center text-xs text-soc-muted">
            Do not have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-primary hover:text-brand-hover hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>

        {/* Demo Seeded Admin Credentials Notice */}
        <div className="rounded-lg border border-soc-border/60 bg-soc-surface/50 p-3.5 text-xs text-soc-muted">
          <div className="font-semibold text-stone-200">Default Seed Admin Credentials:</div>
          <div className="mt-1 font-mono text-[11px] text-stone-400">
            Email: <span className="text-stone-200">admin@cybershield.local</span>
            <br />
            Pass: <span className="text-stone-200">AdminP@ssw0rdSecure!2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
