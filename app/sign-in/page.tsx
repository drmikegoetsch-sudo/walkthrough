"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

type Mode = "magic" | "password";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
            <div className="text-xs text-ink-3">Sign in to continue</div>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col gap-3 py-2">
            <div className="text-sm font-medium">Check your email</div>
            <div className="text-xs text-ink-3">
              We sent a magic link to{" "}
              <span className="font-mono">{email}</span>. Click it to sign in.
            </div>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs text-accent hover:text-accent-2 font-medium text-left"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex p-1 bg-surface-2 border border-surface-3 rounded-full">
              <ModeTab
                active={mode === "magic"}
                onClick={() => setMode("magic")}
              >
                Magic link
              </ModeTab>
              <ModeTab
                active={mode === "password"}
                onClick={() => setMode("password")}
              >
                Password
              </ModeTab>
            </div>

            {mode === "magic" ? (
              <form
                onSubmit={handleMagicLink}
                className="flex flex-col gap-3"
              >
                <EmailField email={email} setEmail={setEmail} />
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? "Sending…" : "Send magic link"}
                </Button>
              </form>
            ) : (
              <form
                onSubmit={handlePassword}
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-surface-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
                  />
                </label>
                <Button type="submit" variant="primary" disabled={sending}>
                  {sending ? "Signing in…" : "Sign in"}
                </Button>
                <div className="text-[11px] text-ink-3 text-center">
                  Need a password? Ask an admin to create your account in
                  Supabase, or use a magic link above.
                </div>
              </form>
            )}
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
