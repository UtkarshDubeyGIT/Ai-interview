import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">V</span> Violet Interview
        </div>
        <div>
          <p className="eyebrow">Decision support, grounded in evidence</p>
          <h1 className="heading">Hear more than a résumé can say.</h1>
          <p style={{ maxWidth: "34rem", color: "var(--theme-neutral-300)" }}>
            Run a focused voice interview, then review every score alongside the
            candidate’s own words.
          </p>
        </div>
        <p style={{ color: "var(--theme-neutral-400)" }}>
          15-minute interviews · English only · Human review required
        </p>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <p className="eyebrow">Company access</p>
          <h2 className="heading">Welcome back</h2>
          <AuthForm mode="login" />
          <p className="muted">
            New here?{" "}
            <Link
              href="/register"
              style={{ color: "var(--theme-text-accent)" }}
            >
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
