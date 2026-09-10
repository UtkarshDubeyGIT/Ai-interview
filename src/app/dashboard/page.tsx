import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CompanyShell } from "@/components/company-shell";
import { db } from "@/server/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const rows = await db()`
    SELECT j.id job_id, j.title, j.created_at, c.id candidate_id, c.candidate_name,
      c.candidate_email, c.status
    FROM jobs j LEFT JOIN candidate_interviews c ON c.job_id = j.id
    WHERE j.owner_id = ${session.user.id}
    ORDER BY j.created_at DESC, c.created_at DESC
  `;
  type CandidateRow = {
    candidate_id: string;
    candidate_name: string;
    candidate_email: string;
    status: string;
  };
  const jobs = new Map<
    string,
    { id: string; title: string; candidates: CandidateRow[] }
  >();
  for (const row of rows) {
    const job: { id: string; title: string; candidates: CandidateRow[] } =
      jobs.get(String(row.job_id)) ?? {
        id: String(row.job_id),
        title: String(row.title),
        candidates: [],
      };
    if (row.candidate_id)
      job.candidates.push({
        candidate_id: String(row.candidate_id),
        candidate_name: String(row.candidate_name),
        candidate_email: String(row.candidate_email),
        status: String(row.status),
      });
    jobs.set(String(row.job_id), job);
  }
  return (
    <CompanyShell email={session.user.email}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Interview workspace</p>
          <h1 className="heading">Roles and candidates</h1>
          <p className="muted">
            Create a role, share its private interview link, and review
            evidence.
          </p>
        </div>
        <Link className="button button-primary" href="/jobs/new">
          Create role
        </Link>
      </div>
      {jobs.size === 0 ? (
        <section className="card empty">
          <h2 className="heading">Start with the role</h2>
          <p className="muted">
            The rubric becomes the spine of every candidate interview and
            report.
          </p>
          <Link className="button button-primary" href="/jobs/new">
            Create your first role
          </Link>
        </section>
      ) : (
        <div className="stack">
          {[...jobs.values()].map((job) => (
            <section className="card" key={job.id}>
              <div className="card-pad page-head" style={{ margin: 0 }}>
                <div>
                  <p className="eyebrow">Role</p>
                  <h2 className="heading" style={{ margin: 0 }}>
                    {job.title}
                  </h2>
                </div>
                <Link
                  className="button button-secondary"
                  href={`/jobs/${job.id}/candidates/new`}
                >
                  Add candidate
                </Link>
              </div>
              {job.candidates.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Candidate</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.candidates.map((candidate) => (
                        <tr key={candidate.candidate_id}>
                          <td>
                            <strong>{candidate.candidate_name}</strong>
                            <br />
                            <span className="muted">
                              {candidate.candidate_email}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`status status-${candidate.status}`}
                            >
                              {String(candidate.status).replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/candidates/${candidate.candidate_id}`}
                            >
                              {candidate.status === "completed"
                                ? "Review report"
                                : "View details"}{" "}
                              →
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-pad muted">No candidates yet.</div>
              )}
            </section>
          ))}
        </div>
      )}
    </CompanyShell>
  );
}
