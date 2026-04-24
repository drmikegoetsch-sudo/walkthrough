"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div className="text-[17px] font-medium tracking-[-0.02em]">Soter Walkthrough</div>
            <div className="text-xs text-ink-3">Sign in to continue</div>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col gap-2 py-4">
            <div className="text-sm font-medium">Check your email</div>
            <div className="text-xs text-ink-3">
              We sent a magic link to <span className="font-mono">{email}</span>. Click
              it to sign in.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-2">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full border border-surface-3 rounded-[var(--radius-sm)] px-3 py-2.5 bg-surface text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:border-accent transition-colors"
              />
            </label>
            <Button type="submit" variant="primary" disabled={sending}>
              {sending ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
