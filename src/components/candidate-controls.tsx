"use client";

import {
  ArrowClockwise,
  Copy,
  Link as LinkIcon,
  LinkBreak,
  Trash,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PrintReport } from "./print-report";
import { ConfirmationDialog } from "./confirmation-dialog";

export function CandidateControls({
  candidate,
  initialShare,
}: {
  candidate: { id: string; status: string; report: unknown };
  initialShare: { active: boolean; url: string | null };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(initialShare);
  const [dialog, setDialog] = useState<"delete" | "revoke" | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (candidate.status !== "processing") return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [candidate.status, router]);

  async function request(action: string, method = "POST") {
    const response = await fetch(`/api/candidates/${candidate.id}/${action}`, {
      method,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error ?? "Action failed");
    return json;
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Report link copied.");
    } catch {
      linkRef.current?.select();
      setMessage("Select the report link and copy it.");
    }
  }

  async function createOrCopyLink() {
    setBusy(true);
    setMessage("");
    try {
      const url = share.url ?? (await request("share")).url;
      setShare({ active: true, url });
      await copy(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink() {
    setBusy(true);
    try {
      await request("share", "DELETE");
      setShare({ active: false, url: null });
      setMessage("Report link revoked. The old link no longer works.");
      setDialog(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCandidate() {
    setBusy(true);
    try {
      await request("delete", "DELETE");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
      setBusy(false);
    }
  }

  async function retryReport() {
    setBusy(true);
    try {
      await request("report");
      setMessage("Report generation restarted.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card card-pad">
      <div className="candidate-control-row">
        <div className="share-control">
          <div className="control-heading">
            <LinkIcon size={19} aria-hidden="true" />
            <div>
              <strong>Candidate report link</strong>
              <span>
                {share.active ? "Anyone with the link can view" : "Not shared"}
              </span>
            </div>
          </div>
          {share.url && (
            <input
              ref={linkRef}
              className="share-url"
              readOnly
              aria-label="Public report link"
              value={share.url}
            />
          )}
          {candidate.status === "completed" && (
            <div className="candidate-actions">
              <button
                className="button button-primary"
                disabled={busy}
                onClick={createOrCopyLink}
              >
                {share.active ? <Copy size={17} /> : <LinkIcon size={17} />}
                {share.active ? "Copy link" : "Create link"}
              </button>
              {share.active && (
                <button
                  className="button button-secondary"
                  disabled={busy}
                  onClick={() => setDialog("revoke")}
                >
                  <LinkBreak size={17} /> Revoke
                </button>
              )}
            </div>
          )}
        </div>
        <div className="candidate-actions candidate-actions-right">
          {!!candidate.report && <PrintReport />}
          {candidate.status === "processing" && (
            <span className="muted" role="status">
              Preparing updated assessment…
            </span>
          )}
          {(candidate.status === "report_failed" ||
            candidate.status === "completed") && (
            <button
              className="button button-primary"
              disabled={busy}
              onClick={retryReport}
            >
              <ArrowClockwise size={17} />{" "}
              {candidate.status === "completed"
                ? "Reassess report"
                : "Retry report"}
            </button>
          )}
          <button
            className="icon-button icon-button-danger"
            disabled={busy}
            onClick={() => setDialog("delete")}
            aria-label="Delete candidate"
            title="Delete candidate"
          >
            <Trash size={20} />
          </button>
        </div>
      </div>
      {message && (
        <p className="notice control-message" aria-live="polite">
          {message}
        </p>
      )}
      <ConfirmationDialog
        open={dialog === "revoke"}
        title="Revoke this report link?"
        description="Anyone using the current link will immediately lose access. You can create a new link later."
        confirmLabel="Revoke link"
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={revokeLink}
      />
      <ConfirmationDialog
        open={dialog === "delete"}
        title="Delete this candidate?"
        description="This permanently deletes the candidate, interview transcript, and report. This cannot be undone."
        confirmLabel="Delete candidate"
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={deleteCandidate}
      />
    </section>
  );
}
