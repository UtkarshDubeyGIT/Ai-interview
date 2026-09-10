import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CompanyShell } from "@/components/company-shell";
import { JobWizard } from "@/components/job-wizard";

export default async function NewJobPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <CompanyShell email={session.user.email}>
      <div className="page-head">
        <div>
          <p className="eyebrow">New role</p>
          <h1 className="heading">Define the interview</h1>
          <p className="muted">
            We’ll generate four weighted competencies for you to review before
            saving.
          </p>
        </div>
      </div>
      <JobWizard />
    </CompanyShell>
  );
}
