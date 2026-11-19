import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Shield, Lock, Mail, User, Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import { registerSchema } from "./authSchemas.js";
import { useAuth } from "./useAuth.js";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";

export function RegisterPage() {
  const { register: registerAuth } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const passwordVal = watch("password", "");

  const checks = [
    { label: "At least 10 characters", pass: passwordVal.length >= 10 },
    { label: "Uppercase letter (A-Z)", pass: /[A-Z]/.test(passwordVal) },
    { label: "Lowercase letter (a-z)", pass: /[a-z]/.test(passwordVal) },
    { label: "Numeric digit (0-9)", pass: /[0-9]/.test(passwordVal) },
    { label: "Special symbol (!@#$...)", pass: /[^A-Za-z0-9]/.test(passwordVal) }
  ];

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await registerAuth({
        name: data.name,
        email: data.email,
        password: data.password
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setServerError(err.message || "Registration failed. Please check your details.");
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
            Register Account
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-wider text-soc-muted">
            Request Access to AI CyberShield SOC
          </p>
        </div>

        <div className="rounded-xl border border-soc-border bg-soc-surface p-6 shadow-2xl sm:p-8">
          <div className="flex items-start gap-2 rounded-md border border-brand-primary/30 bg-brand-primary/10 p-3 text-xs text-stone-200">
            <Info className="h-4 w-4 shrink-0 text-brand-accent mt-0.5" aria-hidden="true" />
            <span>
              Self-registration provisions a <strong>Viewer</strong> account. Administrative and
              analyst elevations are managed by SOC administrators.
            </span>
          </div>

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
              label="Full Name"
              type="text"
              autoComplete="name"
              placeholder="Alex Turner"
              error={errors.name?.message}
              startAdornment={<User className="h-4 w-4" aria-hidden="true" />}
              {...register("name")}
            />

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="alex@organization.local"
              error={errors.email?.message}
              startAdornment={<Mail className="h-4 w-4" aria-hidden="true" />}
              {...register("email")}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

            {/* Password Policy Realtime Checklist */}
            <div className="rounded border border-soc-border/60 bg-soc-dark/40 p-3 text-[11px] text-soc-muted space-y-1">
              <div className="font-semibold text-stone-300 mb-1">Security Policy Requirements:</div>
              {checks.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 ${
                    c.pass ? "text-emerald-400 font-medium" : "text-soc-dim"
                  }`}
                >
                  <span>{c.pass ? "✓" : "○"}</span>
                  <span>{c.label}</span>
                </div>
              ))}
            </div>

            <Input
              label="Confirm Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              error={errors.confirmPassword?.message}
              startAdornment={<Lock className="h-4 w-4" aria-hidden="true" />}
              {...register("confirmPassword")}
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 border-t border-soc-border/60 pt-4 text-center text-xs text-soc-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-brand-primary hover:text-brand-hover hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
