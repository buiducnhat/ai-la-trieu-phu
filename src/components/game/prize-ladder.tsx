import { Check, Star } from "lucide-react";

import { isMilestone, PRIZE_LADDER, TOTAL_QUESTIONS } from "@/lib/game/rules";
import { cn } from "@/lib/utils";

import { Money } from "./money";

interface Props {
  /** Câu đang chơi (1..15). */
  current: number;
  /** Số câu đã trả lời đúng. */
  answered: number;
  className?: string;
}

export function PrizeLadder({ current, answered, className }: Props) {
  const rows = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => TOTAL_QUESTIONS - i);
  return (
    <ol
      aria-label="Thang tiền thưởng"
      className={cn("pixel-box flex flex-col gap-0.5 bg-card p-2", className)}
    >
      {rows.map((n) => {
        const milestone = isMilestone(n);
        const top = n === TOTAL_QUESTIONS;
        const passed = n <= answered;
        const isCurrent = n === current && !passed;
        return (
          <li
            key={n}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex items-center justify-between gap-2 px-2 py-1 text-xl leading-tight",
              milestone || top ? "text-gold" : "text-foreground",
              passed && "opacity-60",
              isCurrent && "bg-gold text-primary-foreground",
            )}
          >
            <span className="flex w-9 items-center gap-1">
              <span className="font-pixel text-[11px]">{n}</span>
              {top ? (
                <Star className="size-3.5 fill-current" aria-label="Mốc triệu phú" />
              ) : milestone ? (
                <span className="size-2 bg-current" aria-label="Mốc quan trọng" />
              ) : null}
            </span>
            <Money value={PRIZE_LADDER[n - 1] as number} digitsClassName="text-[11px]" />
            <span className="w-4">{passed ? <Check className="size-4 text-correct" /> : null}</span>
          </li>
        );
      })}
    </ol>
  );
}
