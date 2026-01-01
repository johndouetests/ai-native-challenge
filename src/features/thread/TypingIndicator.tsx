export function TypingIndicator({ author }: { author: string | null }) {
  return (
    <div className="h-6 shrink-0 px-4" aria-live="polite">
      {author && (
        <p data-testid="typing-indicator" className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">{author} is typing</span>
          <span className="motion-reduce:hidden" aria-hidden="true">
            <span className="inline-block animate-[typing-dot_1.2s_infinite]">.</span>
            <span className="inline-block animate-[typing-dot_1.2s_0.2s_infinite]">.</span>
            <span className="inline-block animate-[typing-dot_1.2s_0.4s_infinite]">.</span>
          </span>
          <span className="hidden motion-reduce:inline">…</span>
        </p>
      )}
    </div>
  )
}
