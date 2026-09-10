import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CompanyShell } from "@/components/company-shell";
import { CandidateForm } from "@/components/candidate-form";
import { db } from "@/server/db";

export default async function NewCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const [job] =
    await db()`SELECT id,title FROM jobs WHERE id=${id} AND owner_id=${session.user.id}`;
  if (!job) redirect("/dashboard");
  return (
    <CompanyShell email={session.user.email}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{job.title}</p>
          <h1 className="heading">Invite a candidate</h1>
          <p className="muted">
            Upload the PDF résumé now. The file is discarded after local text
            extraction.
          </p>
        </div>
      </div>
      <CandidateForm jobId={id} />
    </CompanyShell>
  );
}
