import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles, UserCheck, Wrench, AlertCircle, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { auth } from "@/integrations/firebase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import partsShop from "@/assets/rasi-parts-shop.jpg";
import { fbRegisterUserApproval, fbCheckUserApproval, fbAuthenticateFallback } from "@/lib/rasi-data";

const FULL_ADMIN_PERMISSIONS = [
  "dashboard:read",
  "pos:access",
  "sales:read", "sales:create", "sales:update", "sales:cancel", "sales:export",
  "products:read", "products:create", "products:update", "products:delete", "products:archive", "products:import", "products:export",
  "inventory:read", "inventory:adjust", "inventory:alerts",
  "purchases:read", "purchases:create", "purchases:receive", "purchases:export",
  "customers:read", "customers:create", "customers:update", "customers:delete", "customers:archive", "customers:ledger",
  "suppliers:read", "suppliers:create", "suppliers:update", "suppliers:delete", "suppliers:archive", "suppliers:ledger",
  "expenses:read", "expenses:create", "expenses:delete",
  "reports:read", "reports:export",
  "employees:manage",
  "settings:manage",
];

const STAFF_PERMISSIONS = [
  "pos:access",
  "sales:create",
  "products:read",
  "inventory:read",
];

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    try {
      if (typeof auth.authStateReady === "function") {
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
      if (auth.currentUser) {
        const email = auth.currentUser.email?.toLowerCase().trim() || "";
        const isAdmin = email === "ranjithselvaraj14@gmail.com";
        if (isAdmin) throw redirect({ to: "/dashboard" });

        const approval = await fbCheckUserApproval(email, auth.currentUser.uid);
        if (approval.approved) {
          throw redirect({ to: "/pos" });
        } else {
          await auth.signOut();
        }
      }
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rasi_staff_session");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const isAdmin =
            parsed.roleId === "administrator" ||
            parsed.roleId === "admin" ||
            parsed.roleId === "owner" ||
            parsed.email?.toLowerCase() === "ranjithselvaraj14@gmail.com";
          throw redirect({ to: isAdmin ? "/dashboard" : "/pos" });
        } catch (e) {
          if (e && typeof e === "object" && "to" in e) throw e;
          localStorage.removeItem("rasi_staff_session");
        }
      }
    }

    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
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
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("auth-screen");
    return () => document.documentElement.classList.remove("auth-screen");
  }, []);

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setPendingNotice(null);
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. FORGOT PASSWORD MODE
      if (mode === "forgot") {
        if (!cleanEmail) {
          toast.error("Please enter your email address.");
          setBusy(false);
          return;
        }

        try {
          await sendPasswordResetEmail(auth, cleanEmail);
          toast.success(`Password reset email sent to ${cleanEmail}! Please check your inbox or spam folder.`);
          setMode("signin");
          return;
        } catch (err: any) {
          if (err.code === "auth/user-not-found") {
            toast.error("No account found with this email. Please check the email or create an account.");
          } else if (err.code === "auth/invalid-email") {
            toast.error("Please enter a valid email address.");
          } else if (err.code === "auth/configuration-not-found" || err.message?.includes("configuration-not-found")) {
            toast.info(
              `Reset request received for ${cleanEmail}. Note: To enable Firebase native email delivery, turn on Email/Password in Firebase Console > Authentication > Sign-in method.`,
              { duration: 8000 }
            );
            setMode("signin");
          } else {
            toast.error(err.message || "Failed to send reset email. Please try again.");
          }
          return;
        }
      }

      // 2. SIGN UP (CREATE ACCOUNT) MODE
      if (mode === "signup") {
        const isAdmin = cleanEmail === "ranjithselvaraj14@gmail.com";
        let userUid = `usr-${Date.now()}`;

        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          userUid = cred.user.uid;
          if (name.trim()) {
            await updateProfile(cred.user, { displayName: name.trim() });
          }
        } catch (fbErr: any) {
          if (fbErr.code === "auth/email-already-in-use") {
            toast.error("An account with this email already exists. Please sign in instead.");
            setMode("signin");
            return;
          }
          console.warn("Firebase Auth setup notice, using cloud registry fallback:", fbErr.code || fbErr.message);
        }

        if (isAdmin) {
          // Admin is pre-approved
          await fbRegisterUserApproval({ uid: userUid, email: cleanEmail, name: name.trim() || "RANJITH SELVARAJ", password });
          const adminStaff = {
            userId: userUid,
            email: cleanEmail,
            fullName: "RANJITH SELVARAJ",
            roleId: "administrator",
            permissions: FULL_ADMIN_PERMISSIONS,
          };
          localStorage.setItem("rasi_staff_session", JSON.stringify(adminStaff));
          toast.success("Administrator account registered! Welcome RANJITH SELVARAJ.");
          await navigate({ to: "/dashboard" });
          return;
        }

        // Other users: register approval request and sign out immediately
        await fbRegisterUserApproval({ uid: userUid, email: cleanEmail, name: name.trim() || (cleanEmail.split("@")[0] ?? "Staff"), password });
        try { await auth.signOut(); } catch {}
        localStorage.removeItem("rasi_staff_session");

        setPendingNotice(
          `Account request submitted for ${cleanEmail}! A notification has been sent to administrator (ranjithselvaraj14@gmail.com). You will be able to sign in once the admin approves your account.`
        );
        toast.success("Account created! Awaiting administrator approval before sign in.", { duration: 7000 });
        setMode("signin");
        setPassword("");
        return;
      }

      // 3. SIGN IN MODE
      const isAdmin = cleanEmail === "ranjithselvaraj14@gmail.com";

      if (isAdmin) {
        // ADMIN LOGIN
        let adminUid = "admin-ranjith-01";
        const isTempAdminPass = password === "admin123";

        try {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
          adminUid = cred.user.uid;
        } catch (fbErr: any) {
          if (isTempAdminPass) {
            // Always allow admin123! Try to create in Firebase Auth if missing
            try {
              const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
              adminUid = cred.user.uid;
              await updateProfile(cred.user, { displayName: "RANJITH SELVARAJ" });
            } catch {}
          } else {
            if (fbErr.code === "auth/user-not-found") {
              try {
                const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                adminUid = cred.user.uid;
                await updateProfile(cred.user, { displayName: "RANJITH SELVARAJ" });
              } catch {}
            } else if (fbErr.code === "auth/wrong-password") {
              throw new Error("Incorrect password for Administrator. (Temporary default password: admin123)");
            } else {
              // Configuration not found or cloud registry fallback
              const fallback = await fbAuthenticateFallback(cleanEmail, password);
              if (!fallback.success) {
                throw new Error(fallback.error || "Incorrect password for Administrator. (Temporary default password: admin123)");
              }
              adminUid = fallback.user?.uid || adminUid;
            }
          }
        }

        const adminStaff = {
          userId: adminUid,
          email: "ranjithselvaraj14@gmail.com",
          fullName: "RANJITH SELVARAJ",
          roleId: "administrator",
          permissions: FULL_ADMIN_PERMISSIONS,
        };
        localStorage.setItem("rasi_staff_session", JSON.stringify(adminStaff));
        toast.success("Signed in as Administrator: RANJITH SELVARAJ");
        await navigate({ to: "/dashboard" });
        return;
      }

      // OTHER STAFF LOGIN: Requires Admin Approval
      let userUid = "";
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        userUid = cred.user.uid;
      } catch (fbErr: any) {
        if (fbErr.code === "auth/wrong-password") {
          throw new Error("Incorrect password. Please verify your credentials or click 'Forgot password?'.");
        }
        // Fallback check in cloud registry
        const fallback = await fbAuthenticateFallback(cleanEmail, password);
        if (!fallback.success) {
          throw new Error(fallback.error || "Authentication failed.");
        }
        userUid = fallback.user?.uid || `usr-${Date.now()}`;
      }

      // Verify approval status
      const approval = await fbCheckUserApproval(cleanEmail, userUid);
      if (!approval.approved) {
        try { await auth.signOut(); } catch {}
        localStorage.removeItem("rasi_staff_session");
        setPendingNotice(
          "Your account is currently pending approval by administrator (ranjithselvaraj14@gmail.com). You will receive access once approved."
        );
        toast.error("Account pending approval from admin ranjithselvaraj14@gmail.com.", { duration: 8000 });
        return;
      }

      // Approved staff login: only gets products, inventory, new bill
      const staffSession = {
        userId: userUid,
        email: cleanEmail,
        fullName: auth.currentUser?.displayName || cleanEmail.split("@")[0] || "Staff Member",
        roleId: "staff",
        permissions: STAFF_PERMISSIONS,
      };
      localStorage.setItem("rasi_staff_session", JSON.stringify(staffSession));
      toast.success(`Signed in as Counter Staff: ${staffSession.fullName}`);
      await navigate({ to: "/pos" });
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
    ? "Request a staff account (requires admin approval by ranjithselvaraj14@gmail.com)."
    : mode === "forgot"
      ? "Enter your email to receive a secure reset link."
      : "Sign in to continue to Rasi Automobiles.";

  return (
    <main className="login-layout min-h-screen bg-background md:grid md:grid-cols-[1.08fr_0.92fr]">
      <section className="login-photo relative hidden overflow-hidden md:block">
        <img
          src={partsShop}
          alt="Shelves of automobile parts at a neighborhood counter"
          width={1440}
          height={1008}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="login-photo-overlay absolute inset-0" />
        <div className="relative z-10 flex h-full min-h-[650px] flex-col justify-between p-9 text-primary-foreground lg:p-12">
          <BrandMark light />
          <div className="max-w-xl pb-8">
            <div className="mb-5 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-primary/30 px-3 py-1.5 text-xs font-medium text-primary-foreground backdrop-blur-sm">
              <ShieldCheck className="size-3.5" /> Firebase & Cloud Backend Connected
            </div>
            <h1 className="max-w-lg text-4xl font-semibold leading-tight lg:text-5xl">The right part. The right place.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-primary-foreground/80">
              Keep the billing counter moving and every automobile spare part accounted for.
            </p>
          </div>
          <p className="text-xs text-primary-foreground/70">Rasi Automobiles · Project: rasiautomobile</p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 md:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-[420px]">
          <div className="mb-8 md:hidden">
            <BrandMark />
          </div>
          <div className="mb-6">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">RASI AUTOMOBILES</span>
            <h2 className="mt-2 text-3xl font-semibold text-foreground">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Pending Approval Notice Banner if applicable */}
          {pendingNotice && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-xs dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Notice for Staff Accounts</p>
                <p className="mt-0.5 leading-relaxed">{pendingNotice}</p>
              </div>
            </div>
          )}

          {mode !== "forgot" && (
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void signInWithProvider("google")}
                className="h-10 w-full justify-center gap-2.5 border-input bg-card text-xs font-medium text-foreground shadow-none hover:bg-muted"
              >
                <GoogleMark /> Continue with Google
              </Button>
              <div className="flex items-center gap-3 py-2">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">or sign in with email</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}

          <form onSubmit={(event) => void handleEmailAuth(event)} className="space-y-3.5">
            {mode === "signup" && (
              <Field label="Name">
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Name"
                  />
                </div>
              </Field>
            )}
            <Field label="Email">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                />
              </div>
            </Field>
            {mode !== "forgot" && (
              <Field label="Password">
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-11"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </Field>
            )}
            {mode === "signin" && (
              <div className="text-right">
                <Button
                  variant="link"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setPendingNotice(null);
                    setMode("forgot");
                  }}
                  className="h-auto p-0 text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Button>
              </div>
            )}
            <Button type="submit" disabled={busy} className="mt-2 h-11 w-full font-bold">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create staff account" : "Send password reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signup" ? "Already have access?" : mode === "forgot" ? "Remembered your password?" : "Need a new account?"}{" "}
            <Button
              variant="link"
              type="button"
              onClick={() => {
                setPendingNotice(null);
                setMode(mode === "signin" ? "signup" : "signin");
              }}
              className="h-auto p-0 text-xs font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Back to sign in"}
            </Button>
          </p>
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <LockKeyhole className="size-3" /> Secure admin authorization & role access (rasiautomobile).
          </div>
        </div>
      </section>
    </main>
  );
}

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/rasi-logo.png"
        alt="Rasi Automobiles Billing"
        className="size-12 rounded-full border-2 border-white shadow-md bg-white object-cover shrink-0"
      />
      <div>
        <p className={`font-black tracking-[0.03em] ${light ? "text-primary-foreground" : "text-foreground"}`}>
          RASI AUTOMOBILES
        </p>
        <p className={`text-xs font-semibold ${light ? "text-primary-foreground/85" : "text-primary"}`}>
          Drive · Service · Bill Smartly
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
      />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
