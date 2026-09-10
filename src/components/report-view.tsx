import {
  CheckCircle,
  FileMagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";

type Finding = {
  resumeClaim: string;
  candidateStatement: string;
  evidence?: string[];
};

export type ReportData = {
  evaluationVersion?: number;
  evidenceCoverage?: number;
  generatedAt?: string;
  screeningRecommendation?: "in_person" | "not_hireable" | "more_evidence";
  assessmentStatus?: "scored" | "insufficient_evidence" | "closed_early";
  weightedScore: number | null;
  recommendation: string | null;
  summary: string;
  scoreRationale?: string;
  strengths?: string[];
  concerns?: string[];
  contradictions?: string[];
  competencies?: Array<{
    name: string;
    score: number | null;
    evidence?: string[];
    missingEvidence?: string[];
    resumeImpact?: string;
  }>;
  resumeAlignment?: {
    status: "aligned" | "mixed" | "misaligned" | "not_assessed";
    matches: Finding[];
    mismatches: Finding[];
    undefendedClaims: Finding[];
  };
};

function FindingList({
  title,
  findings,
}: {
  title: string;
  findings: Finding[];
}) {
  if (!findings.length) return null;
  return (
    <section className="report-subsection">
      <h3>{title}</h3>
      {findings.map((finding, index) => (
        <article className="evidence-item" key={`${title}-${index}`}>
          <p>
            <strong>Résumé:</strong> {finding.resumeClaim}
          </p>
          <p>
            <strong>Interview:</strong> {finding.candidateStatement}
          </p>
          {finding.evidence?.length ? (
            <small>{finding.evidence.join(" · ")}</small>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function ReportView({ report }: { report: ReportData }) {
  const status =
    report.assessmentStatus ??
    (report.weightedScore === null ? "insufficient_evidence" : "scored");
  const scored = status === "scored" && report.weightedScore !== null;
  const disposition = report.screeningRecommendation ?? "more_evidence";
  const stamp =
    disposition === "in_person"
      ? "Consider for an in-person call"
      : disposition === "not_hireable"
        ? "Not hireable"
        : "More evidence needed";
  const StampIcon = disposition === "in_person" ? CheckCircle : WarningCircle;
  const alignment = report.resumeAlignment;

  return (
    <article className="report-view stack">
      <div className="report-masthead">
        <div>
          <p className="eyebrow">Interview Buddy / Candidate assessment</p>
          <h2 className="report-title">Interview performance report</h2>
        </div>
        <span className="report-edition">
          {report.generatedAt
            ? new Date(report.generatedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })
            : "Previous assessment"}
        </span>
      </div>
      <div className="report-verdict">
        <div>
          <p className="eyebrow">Screening recommendation</p>
          <p className="report-verdict-note">
            {report.evaluationVersion === 2
              ? "Based on demonstrated performance and available evidence."
              : "This report uses the previous evaluation. Reassess it before making a screening decision."}
          </p>
        </div>
        <div
          className={`report-stamp report-stamp-${disposition}`}
          role="status"
        >
          <StampIcon size={22} aria-hidden="true" />
          <strong>{stamp}</strong>
          <span>For human review</span>
        </div>
      </div>
      <header className="report-summary">
        <div className={`report-score report-score-${status}`}>
          <span>
            {scored ? (
              <>
                {report.weightedScore}
                <em> / 5</em>
              </>
            ) : (
              "—"
            )}
          </span>
          <small>{scored ? "observed performance" : "not scored"}</small>
        </div>
        <div>
          <p className="eyebrow">01 / Executive assessment</p>
          <h2 className="heading">
            {status === "closed_early"
              ? "Interview closed early"
              : "What the conversation demonstrated"}
          </h2>
          <p>{report.summary}</p>
          {report.scoreRationale && (
            <p className="muted">{report.scoreRationale}</p>
          )}
        </div>
      </header>

      <div className="report-method">
        <strong>
          {report.evidenceCoverage !== undefined
            ? `${report.evidenceCoverage}% of rubric weight assessed`
            : "Evidence coverage not recorded"}
        </strong>
        <p>
          Scores reflect the substance and usefulness of answers. Brevity,
          missing jargon and unasked technical details are not weaknesses.
          Unexplored areas are follow-up topics. This screening report supports
          a human decision.
        </p>
      </div>

      {Boolean(report.strengths?.length || report.concerns?.length) && (
        <div className="grid grid-2 report-columns">
          <section className="report-subsection">
            <h3>
              <CheckCircle size={20} weight="fill" /> Demonstrated strengths
            </h3>
            <ul>
              {report.strengths?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="report-subsection">
            <h3>
              <WarningCircle size={20} weight="fill" /> Evidence-backed concerns
            </h3>
            <ul>
              {report.concerns?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {!report.concerns?.length && (
              <p className="muted">No material concerns documented.</p>
            )}
          </section>
        </div>
      )}

      <section className="report-section">
        <div className="report-section-heading">
          <FileMagnifyingGlass size={22} aria-hidden="true" />
          <div>
            <p className="eyebrow">02 / Résumé alignment</p>
            <h2 className="heading">Claims compared with the conversation</h2>
          </div>
          {alignment && (
            <span className={`status alignment-${alignment.status}`}>
              {alignment.status.replaceAll("_", " ")}
            </span>
          )}
        </div>
        {!alignment || alignment.status === "not_assessed" ? (
          <p className="muted">
            Résumé alignment could not be assessed from the available evidence.
          </p>
        ) : (
          <div className="grid grid-2 report-columns">
            <FindingList
              title="Confirmed experience"
              findings={alignment.matches}
            />
            <FindingList title="Mismatches" findings={alignment.mismatches} />
            <FindingList
              title="Claims to explore further"
              findings={alignment.undefendedClaims}
            />
          </div>
        )}
      </section>

      <section className="report-section">
        <p className="eyebrow">03 / Competency evidence</p>
        <div className="competency-grid">
          {report.competencies?.map((competency) => (
            <article className="competency-card" key={competency.name}>
              <div className="competency-heading">
                <h3>{competency.name}</h3>
                <span>
                  {competency.score === null ? "—" : `${competency.score}/5`}
                </span>
              </div>
              <p>
                {competency.evidence?.join(" · ") ||
                  "No supporting interview evidence."}
              </p>
              {alignment &&
                alignment.status !== "not_assessed" &&
                competency.resumeImpact && (
                  <p className="resume-impact">
                    <strong>Résumé impact:</strong> {competency.resumeImpact}
                  </p>
                )}
              {!!competency.missingEvidence?.length && (
                <p className="muted">
                  Follow up: {competency.missingEvidence.join(" · ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </section>

      {!!report.contradictions?.length && (
        <section className="report-subsection">
          <h3>Other contradictions</h3>
          <ul>
            {report.contradictions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <footer className="report-footer">
        <span>Interview Buddy · Confidential candidate report</span>
        <span>Prepared for human review</span>
      </footer>
    </article>
  );
}
