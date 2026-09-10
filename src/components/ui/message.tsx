// Adapted from ElevenLabs UI (MIT); see THIRD_PARTY_NOTICES.md.
import type { HTMLAttributes } from "react";

export function Message({
  from,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { from: "user" | "assistant" }) {
  return (
    <div
      className={`message ${from === "user" ? "is-user" : "is-assistant"} ${className}`}
      {...props}
    />
  );
}

export function MessageContent({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`message-content ${className}`} {...props} />;
}
