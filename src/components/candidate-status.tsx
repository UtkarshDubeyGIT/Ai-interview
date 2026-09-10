import {
  CheckCircle,
  Circle,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
  candidateStatusPresentation,
  type CompletionReason,
} from "@/domain/interview";

export function CandidateStatus({
  status,
  completionReason,
}: {
  status: string;
  completionReason?: CompletionReason | null;
}) {
  const presentation = candidateStatusPresentation(status, completionReason);
  const Icon =
    presentation.tone === "complete"
      ? CheckCircle
      : presentation.tone === "active"
        ? SpinnerGap
        : presentation.tone === "attention"
          ? WarningCircle
          : Circle;

  return (
    <span
      className={`candidate-status candidate-status-${presentation.tone}`}
      role="status"
    >
      <Icon size={15} weight="fill" aria-hidden="true" />
      {presentation.label}
    </span>
  );
}
