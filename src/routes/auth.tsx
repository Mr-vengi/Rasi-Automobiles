import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import partsShop from "@/assets/rasi-parts-shop.jpg";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Sign in | Rasi Automobiles" },
      { name: "description", content: "Sign in to the Rasi Automobiles business workspace." },
      { property: "og:title", content: "Sign in | Rasi Automobiles" },
      { property: "og:description", content: "Secure sign in to the Rasi Automobiles business workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("auth-screen");
    return () => document.documentElement.classList.remove("auth-screen");
  }, []);

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Password reset instructions sent. Check your email.");
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Please check your email to confirm your account.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }

      const { data: authData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", authData.user?.id ?? "")
        .maybeSingle();
      if (authData.user && !profile) {
        await supabase.auth.signOut();
        throw new Error("This account is not part of the Rasi Automobiles team yet. Ask the owner to add your account.");
      }
      await navigate({ to: "/" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithProvider(provider: "google" | "lovable") {
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (result.error) throw result.error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in. Please try again.");
    }
  }

  const title = mode === "signup" ? "Create your workspace access" : mode === "forgot" ? "Reset your password" : "Welcome back";
  const description = mode === "signup"
    ? "Request a staff account for your business."
    : mode === "forgot"
      ? "We'll send you a secure reset link."
      : "Sign in to continue to your business.";

  return (
    <main className="login-layout min-h-screen bg-background md:grid md:grid-cols-[1.08fr_0.92fr]">
      <section className="login-photo relative hidden overflow-hidden md:block">
        <img src={partsShop} alt="Shelves of automobile parts at a neighborhood counter" width={1440} height={1008} className="absolute inset-0 size-full object-cover" />
        <div className="login-photo-overlay absolute inset-0" />
        <div className="relative z-10 flex h-full min-h-[650px] flex-col justify-between p-9 text-primary-foreground lg:p-12">
          <BrandMark light />
          <div className="max-w-xl pb-8">
            <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-primary/30 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
              <ShieldCheck className="size-3.5" /> Private business workspace
            </div>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight lg:text-5xl">The right part. The right place.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-primary-foreground/80">Keep the counter moving and every spare part accounted for.</p>
          </div>
          <p className="text-xs text-primary-foreground/70">Rasi Automobiles · Secure staff access</p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-11 md:hidden"><BrandMark /></div>
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">RASI AUTOMOBILES</span>
            <h2 className="mt-3 text-3xl font-semibold text-foreground">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>

          {mode !== "forgot" && (
            <div className="space-y-3">
              <Button type="button" variant="outline" disabled={busy} onClick={() => void signInWithProvider("google")} className="h-11 w-full justify-center gap-3 border-input bg-card font-medium text-foreground shadow-none hover:bg-muted">
                <GoogleMark /> Continue with Google
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void signInWithProvider("lovable")} className="h-11 w-full justify-center gap-3 border-input bg-card font-medium text-foreground shadow-none hover:bg-muted">
                <Wrench className="size-4 text-primary" /> Continue with Lovable
              </Button>
              <div className="flex items-center gap-3 py-2">
                <span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">or continue with email</span><span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={(event) => void handleEmailAuth(event)} className="space-y-4">
            {mode === "signup" && <Field label="Your name"><Input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" /></Field>}
            <Field label="Email address"><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-10" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></Field>
            {mode !== "forgot" && (
              <Field label="Password">
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-10 pr-11" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" />
                  <Button variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </Field>
            )}
            {mode === "signin" && <div className="text-right"><Button variant="link" size="sm" type="button" onClick={() => setMode("forgot")} className="h-auto p-0 font-medium text-primary">Forgot password?</Button></div>}
            <Button type="submit" disabled={busy} className="mt-2 h-11 w-full">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have access?" : mode === "forgot" ? "Remembered your password?" : "Need a staff account?"} {" "}
            <Button variant="link" type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="h-auto p-0 font-semibold text-primary">{mode === "signin" ? "Request access" : "Back to sign in"}</Button>
          </p>
          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Your business data stays private to your team.</div>
        </div>
      </section>
    </main>
  );
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-11 items-center justify-center rounded-md bg-warning text-warning-foreground"><Wrench className="size-5" /></div>
      <div><p className={`font-bold tracking-[0.02em] ${light ? "text-primary-foreground" : "text-foreground"}`}>RASI AUTOMOBILES</p><p className={`text-xs ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>Parts · Service · Care</p></div>
    </div>
  );
}

function GoogleMark() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-foreground">{label}</span>{children}</label>;
}