interface ChatGreetingProps {
  modelCount?: number | null;
}

export function ChatGreeting({ modelCount }: ChatGreetingProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <img
        src="./src/shared/assets/owl_teaching_with_glasses.png"
        alt="The Nocturnal Athenaeum mascot"
        className="w-64 h-64 object-contain drop-shadow-lg"
      />
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-[var(--owl-brown-deep)] tracking-tight">
          The Docent
        </h1>
        <p className="text-[var(--owl-brown)] text-base opacity-80">
          Your guide through knowledge, one question at a time.
        </p>
      </div>

      {modelCount != null && (
        <div className="flex items-center gap-1.5 rounded-full bg-[var(--owl-cream)]/60 border border-[var(--owl-border)] px-3 py-1 text-xs text-[var(--owl-brown-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--owl-orange)]" />
          {modelCount} model{modelCount === 1 ? "" : "s"} available
        </div>
      )}
    </div>
  );
}
