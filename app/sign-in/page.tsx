"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signupConfirmEmail, setSignupConfirmEmail] = useState<string | null>(
    null,
  );

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // If email confirmation is required, Supabase returns a user with no
    // session. In that case show a "check your email" state. Otherwise
    // the user is already signed in and we go straight to the dashboard.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setSignupConfirmEmail(email);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div className="text-[17px] font-medium tracking-[-0.02em]">
              Soter Walkthrough
            </div>
            <div className="text-xs text-ink-3">
              {mode === "signup"
                ? "Create your account"
                : "Sign in to continue"}
            </div>
          </div>
        </div>

        {signupConfirmEmail ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="text-sm font-medium">Check your email</div>
            <div className="text-xs text-ink-3">
              We sent a confirmation link to{" "}
              <span className="font-mono">{signupConfirmEmail}</span>. Click it
              to finish creating your account, then sign in.
            </div>
            <button
              type="button"
              onClick={() => {
                setSignupConfirmEmail(null);
                setMode("signin");
                setPassword("");
              }}
              className="text-xs text-accent hover:text-accent-2 font-medium text-left"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex p-1 bg-surface-2 border border-surface-3 rounded-full">
              <ModeTab
                active={mode === "signin"}
                onClick={() => setMode("signin")}
              >
                Sign in
              </ModeTab>
              <ModeTab
                active={mode === "signup"}
                onClick={() => setMode("signup")}
              >
                Sign up
              </ModeTab>
            </div>

            <form
              onSubmit={mode === "signup" ? handleSignUp : handleSignIn}
              className="flex flex-col gap-3"
            >
              <EmailField email={email} setEmail={setEmail} />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-2">
                  Password
                </span>
                <input
                  type="password"
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "signup" ? "At least 8 characters" : "••••••••"
                  }
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  className="w-full border border-surface-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
                />
              </label>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting
                  ? mode === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : mode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 text-xs font-medium rounded-full py-1.5 transition-colors",
        active
          ? "bg-white text-ink shadow-[var(--shadow-sm)]"
          : "text-ink-3 hover:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}

function EmailField({
  email,
  setEmail,
}: {
  email: string;
  setEmail: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-2">Email</span>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="w-full border border-surface-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
        autoComplete="email"
      />
    </label>
  );
}
