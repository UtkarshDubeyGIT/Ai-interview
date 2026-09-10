import Link from "next/link";
import { signOut } from "@/auth";

export function CompanyShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <Link href="/dashboard" className="brand">
            <span className="brand-mark">V</span> Violet Interview
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="button button-secondary" type="submit">
              Sign out<span className="muted">{email}</span>
            </button>
          </form>
        </div>
      </header>
      <main className="shell main">{children}</main>
    </>
  );
}
