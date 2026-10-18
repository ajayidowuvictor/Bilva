"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/config";
import Brand from "@/components/Brand";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 8) {
      setError("Your password needs at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(
            signInError.message === "Invalid login credentials"
              ? "That email and password do not match. Please try again."
              : signInError.message,
          );
          return;
        }
        router.push("/projects");
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.push("/projects");
        router.refresh();
        return;
      }
      setNotice(
        "Almost done. We sent a confirmation link to your email. Open it, then come back and sign in.",
      );
      setMode("signin");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Brand href="/" />
        </div>
      </header>

      <main>
        <div className="container" style={{ maxWidth: 440 }}>
          <div className="stack-lg">
            <div className="stack">
              <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
              <p className="muted">
                {mode === "signin"
                  ? "Sign in to continue your projects."
                  : "Save your ideas and copy in one private place."}
              </p>
            </div>

            {!supabaseConfigured && (
              <div className="alert alert-info">
                Bilva is not connected to its database yet, so sign-in is
                switched off for now.
              </div>
            )}

            {notice && <div className="alert alert-info">{notice}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <form className="card stack" onSubmit={onSubmit}>
              <label className="field">
                <span className="label">Email</span>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!supabaseConfigured}
                />
              </label>

              <label className="field">
                <span className="label">Password</span>
                <input
                  className="input"
                  type="password"
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!supabaseConfigured}
                />
                {mode === "signup" && (
                  <span className="hint">At least 8 characters.</span>
                )}
              </label>

              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={busy || !supabaseConfigured}
              >
                {busy
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            {mode === "signup" && (
              <p className="muted small" style={{ textAlign: "center" }}>
                By creating an account you agree to the{" "}
                <Link href="/terms">Terms</Link> and the{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            )}

            <p className="muted" style={{ textAlign: "center" }}>
              {mode === "signin" ? "New to Bilva? " : "Already have an account? "}
              <button
                type="button"
                className="toggle"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setError(null);
                  setNotice(null);
                }}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
