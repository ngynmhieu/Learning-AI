import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Check, Sparkles, Cpu, ChevronRight } from "lucide-react";
import { ArrowUpIcon, StopIcon, Dropdown, DropdownItem } from "@/shared/ui";
import type { ModelInfo } from "@/shared/api";

interface ChatInputProps {
  isStreaming: boolean;
  thinkingEnabled: boolean;
  onToggleThinking: () => void;
  models: ModelInfo[];
  selectedModel: string | null;
  onSelectModel: (id: string) => void;
  onSend: (content: string) => void;
  onStop: () => void;
}

/** "Models" row that reveals a side submenu of available models on hover. */
function ModelMenuItem({
  models,
  selectedModel,
  onSelect,
}: {
  models: ModelInfo[];
  selectedModel: string | null;
  onSelect: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <DropdownItem icon={<Cpu className="w-4 h-4" />}>
        <span className="flex-1 text-left">Models</span>
        <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
      </DropdownItem>

      <AnimatePresence>
        {hover && (
          <Dropdown position="left-full bottom-0 ml-1">
            {models.map((m) => (
              <DropdownItem key={m.id} onClick={() => onSelect(m.id)}>
                <span className="flex-1 text-left truncate">{m.id}</span>
                {m.id === selectedModel && (
                  <Check className="w-4 h-4 shrink-0 text-[var(--owl-orange)]" />
                )}
              </DropdownItem>
            ))}
          </Dropdown>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The "+" button + its upward dropdown holding thinking + model controls. */
function ComposerMenu({
  disabled,
  thinkingEnabled,
  onToggleThinking,
  models,
  selectedModel,
  onSelectModel,
}: {
  disabled: boolean;
  thinkingEnabled: boolean;
  onToggleThinking: () => void;
  models: ModelInfo[];
  selectedModel: string | null;
  onSelectModel: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectModel = (id: string) => {
    onSelectModel(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        disabled={disabled}
        aria-label="Options"
        aria-expanded={open}
        whileTap={{ scale: 0.92 }}
        className={`shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
          open
            ? "border-[var(--owl-orange)]/50 bg-[var(--accent-bg)] text-[var(--owl-orange-deep)]"
            : "border-[var(--owl-border)] text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-dark)] hover:border-[var(--owl-brown-mid)]/50"
        }`}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.18 }}
          className="inline-flex"
        >
          <Plus className="w-5 h-5" />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Click-away backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <Dropdown position="bottom-full left-0 mb-2">
              <DropdownItem
                onClick={onToggleThinking}
                icon={<Sparkles className="w-4 h-4" />}
              >
                <span className="flex-1 text-left">Extended thinking</span>
                {thinkingEnabled && (
                  <Check className="w-4 h-4 shrink-0 text-[var(--owl-orange)]" />
                )}
              </DropdownItem>

              {models.length > 0 && (
                <ModelMenuItem
                  models={models}
                  selectedModel={selectedModel}
                  onSelect={selectModel}
                />
              )}
            </Dropdown>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatInput({
  isStreaming,
  thinkingEnabled,
  onToggleThinking,
  models,
  selectedModel,
  onSelectModel,
  onSend,
  onStop,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-6 pt-2">
      <div
        className="flex flex-col gap-2.5 bg-white/60 backdrop-blur-md border border-[var(--owl-border)] rounded-2xl px-4 py-3 shadow-md cursor-text transition-all duration-200 focus-within:shadow-lg focus-within:border-[var(--owl-orange)]/40"
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          placeholder="Ask the Docent anything..."
          className="flex-1 resize-none bg-transparent text-[var(--owl-brown-dark)] placeholder-[var(--owl-brown-muted)] text-base leading-8 outline-none max-h-40 disabled:opacity-50"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />

        <div className="flex items-center justify-between gap-2">
          <ComposerMenu
            disabled={isStreaming}
            thinkingEnabled={thinkingEnabled}
            onToggleThinking={onToggleThinking}
            models={models}
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
          />

          {isStreaming ? (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
              aria-label="Stop generating"
              whileTap={{ scale: 0.92 }}
              className="shrink-0 w-9 h-9 rounded-xl bg-[var(--owl-brown-muted)] hover:bg-[var(--owl-brown-dark)] transition-colors flex items-center justify-center text-[var(--owl-cream)]"
            >
              <StopIcon size={20} />
            </motion.button>
          ) : (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
              disabled={!value.trim()}
              aria-label="Send"
              whileTap={{ scale: 0.92 }}
              className="shrink-0 w-9 h-9 rounded-xl bg-[var(--owl-brown)] hover:bg-[var(--owl-brown-dark)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-[var(--owl-cream)]"
            >
              <ArrowUpIcon size={20} />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
