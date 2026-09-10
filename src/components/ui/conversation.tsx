"use client";

// Adapted from ElevenLabs UI (MIT); see THIRD_PARTY_NOTICES.md.
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";

const ScrollContext = createContext({
  atBottom: true,
  scrollToBottom: () => {},
});

export function Conversation({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const [atBottom, setAtBottom] = useState(true);
  function scrollToBottom() {
    const element = viewport.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    pinned.current = true;
    setAtBottom(true);
  }
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (pinned.current && viewport.current)
        viewport.current.scrollTop = viewport.current.scrollHeight;
    });
    if (content.current) observer.observe(content.current);
    return () => observer.disconnect();
  }, []);
  return (
    <ScrollContext.Provider value={{ atBottom, scrollToBottom }}>
      <div className={`conversation ${className}`} {...props}>
        <div
          className="conversation-viewport"
          ref={viewport}
          role="log"
          aria-label="Interview transcript"
          aria-live="polite"
          tabIndex={0}
          onScroll={() => {
            const element = viewport.current;
            if (!element) return;
            pinned.current =
              element.scrollHeight - element.scrollTop - element.clientHeight <
              40;
            setAtBottom(pinned.current);
          }}
        >
          <div ref={content}>{children}</div>
        </div>
        <ConversationScrollButton />
      </div>
    </ScrollContext.Provider>
  );
}

export function ConversationContent({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`conversation-content ${className}`} {...props} />;
}

export function ConversationEmptyState({
  title = "Your conversation will appear here",
  description = "Completed answers and questions are saved as you speak.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="conversation-empty">
      <span aria-hidden="true">“</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function ConversationScrollButton() {
  const { atBottom, scrollToBottom } = useContext(ScrollContext);
  return (
    !atBottom && (
      <button
        className="button conversation-scroll"
        type="button"
        onClick={scrollToBottom}
      >
        ↓ Latest message
      </button>
    )
  );
}
