import { cn } from "@/lib/utils";

export type AnswerState = "idle" | "selected" | "locked" | "correct" | "wrong" | "removed";

const LETTERS = ["A", "B", "C", "D"] as const;

interface Props {
  index: number;
  text: string;
  state: AnswerState;
  disabled?: boolean;
  onClick: () => void;
}

const STATE_CLASS: Record<AnswerState, string> = {
  idle: "bg-card hover:bg-accent text-card-foreground",
  selected: "bg-gold text-primary-foreground",
  locked: "bg-gold text-primary-foreground animate-blink-pixel",
  correct: "bg-correct text-primary-foreground",
  wrong: "bg-wrong text-primary-foreground animate-shake-pixel",
  removed: "bg-transparent text-transparent pointer-events-none",
};

export function AnswerButton({ index, text, state, disabled, onClick }: Props) {
  const removed = state === "removed";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || removed}
      aria-pressed={state === "selected" || state === "locked"}
      aria-label={
        removed ? `Phương án ${LETTERS[index]} đã bị loại` : `Phương án ${LETTERS[index]}: ${text}`
      }
      data-state={state === "locked" ? "selected" : state}
      className={cn(
        "pixel-box flex min-h-16 items-center gap-3 px-3 py-2 text-left text-2xl leading-tight transition-colors sm:min-h-20 sm:text-3xl",
        "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold",
        "disabled:cursor-default",
        STATE_CLASS[state],
        removed && "shadow-none",
      )}
    >
      <span
        className={cn(
          "font-pixel shrink-0 text-sm sm:text-base",
          state === "idle" ? "text-gold" : "text-primary-foreground",
          removed && "invisible",
        )}
      >
        {LETTERS[index]}:
      </span>
      <span className={cn("min-w-0 break-words", removed && "invisible")}>{text}</span>
    </button>
  );
}
