"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "./ui/conversation";
import { Message, MessageContent } from "./ui/message";

export type DisplayTurn = {
  id: string;
  role: "candidate" | "interviewer";
  text: string;
};

export function InterviewTranscript({
  turns,
  candidateName,
  live = false,
}: {
  turns: DisplayTurn[];
  candidateName: string;
  live?: boolean;
}) {
  return (
    <section
      className="transcript-panel"
      aria-label={live ? "Live captions" : "Transcript"}
    >
      <header className="transcript-header">
        <div>
          <p className="eyebrow">{live ? "Live captions" : "Conversation"}</p>
          <h2 className="heading">Interview transcript</h2>
        </div>
        <span className="transcript-count">{turns.length} turns</span>
      </header>
      <Conversation>
        <ConversationContent>
          {turns.length ? (
            turns.map((turn) => (
              <Message
                key={turn.id}
                from={turn.role === "candidate" ? "user" : "assistant"}
              >
                <div className="message-avatar" aria-hidden="true">
                  {turn.role === "candidate" ? candidateName.slice(0, 1) : "M"}
                </div>
                <MessageContent>
                  <span className="message-meta">
                    {turn.role === "candidate" ? candidateName : "Mira"}
                    <span>
                      {turn.role === "candidate"
                        ? live
                          ? "You"
                          : "Candidate"
                        : "AI interviewer"}
                    </span>
                  </span>
                  <p>{turn.text}</p>
                </MessageContent>
              </Message>
            ))
          ) : (
            <ConversationEmptyState />
          )}
        </ConversationContent>
      </Conversation>
      <footer className="transcript-footer">
        Captions may contain transcription errors.
      </footer>
    </section>
  );
}
