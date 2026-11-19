import React from "react";
import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Button } from "../ui/Button.jsx";

export function NotFoundPage() {
  return (
    <div
      role="main"
      className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-soc-border bg-soc-surface text-brand-primary shadow-warm">
        <ShieldX className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className="mt-6 font-mono text-xs uppercase tracking-widest text-brand-primary">
        404 — Target Not Found
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-100 sm:text-3xl">
        Security Zone Does Not Exist
      </h1>
      <p className="mt-2 max-w-md text-sm text-soc-muted">
        The requested resource endpoint or route is invalid or has been relocated within the SOC
        architecture.
      </p>

      <div className="mt-8">
        <Link to="/dashboard">
          <Button
            variant="primary"
            size="md"
            iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
          >
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
