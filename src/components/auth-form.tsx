"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    try {
      if (mode === "register") {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok)
          throw new Error(
            (await response.json()).error ?? "Registration failed",
          );
      }
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error("Email or password is incorrect");
      router.push("/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to continue");
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="email">Work email</label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={12}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        <small className="muted">At least 12 characters</small>
      </div>
      <button className="button button-primary" disabled={busy}>
        {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
