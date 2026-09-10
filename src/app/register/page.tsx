import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">V</span> Violet Interview
        </div>
        <div>
          <p className="eyebrow">A clearer first conversation</p>
          <h1 className="heading">Create interviews worth reviewing.</h1>
          <p style={{ maxWidth: "34rem", color: "var(--theme-neutral-300)" }}>
            Set the role, invite a candidate, and turn a real conversation into
            traceable evidence.
          </p>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <p className="eyebrow">Get started</p>
          <h2 className="heading">Create your account</h2>
          <AuthForm mode="register" />
          <p className="muted">
            Already registered?{" "}
            <Link href="/login" style={{ color: "var(--theme-text-accent)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
