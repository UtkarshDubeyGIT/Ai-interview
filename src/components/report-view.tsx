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
  const scored = status === "scored";
  const alignment = report.resumeAlignment;

  return (
    <div className="report-view stack">
      <header className="report-summary">
        <div className={`report-score report-score-${status}`}>
          <span>{scored ? report.weightedScore : "—"}</span>
          <small>
            {scored
              ? "performance score"
              : status === "closed_early"
                ? "closed early"
                : "not scored"}
          </small>
        </div>
        <div>
          <p className="eyebrow">Assessment</p>
          <h2 className="heading">
            {scored
              ? report.recommendation
              : status === "closed_early"
                ? "Interview closed before time"
                : "More evidence needed"}
          </h2>
          <p>{report.summary}</p>
          {report.scoreRationale && (
            <p className="muted">{report.scoreRationale}</p>
          )}
        </div>
      </header>

      <div className="notice">
        Decision support only—human review is required.
      </div>

      {(report.strengths?.length || report.concerns?.length) && (
        <div className="grid grid-2 report-columns">
          <section className="report-subsection">
            <h3>
              <CheckCircle size={20} weight="fill" /> Strengths
            </h3>
            <ul>
              {report.strengths?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="report-subsection">
            <h3>
              <WarningCircle size={20} weight="fill" /> Concerns
            </h3>
            <ul>
              {report.concerns?.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="report-section">
        <div className="report-section-heading">
          <FileMagnifyingGlass size={22} aria-hidden="true" />
          <div>
            <p className="eyebrow">Résumé alignment</p>
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
              title="Claims not defended"
              findings={alignment.undefendedClaims}
            />
          </div>
        )}
      </section>

      <section className="report-section">
        <p className="eyebrow">Rubric performance</p>
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
              {competency.resumeImpact && (
                <p className="resume-impact">
                  <strong>Résumé impact:</strong> {competency.resumeImpact}
                </p>
              )}
              {!!competency.missingEvidence?.length && (
                <p className="muted">
                  Missing: {competency.missingEvidence.join(" · ")}
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
    </div>
  );
}
