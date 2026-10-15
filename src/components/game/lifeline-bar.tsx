import { GraduationCap, Lock, Phone, UserPlus, X } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/8bit/tooltip";
import { isLifelineAvailableAt, LIFELINES, type LifelineId } from "@/lib/game/rules";
import { cn } from "@/lib/utils";

const ICONS: Record<LifelineId, React.ReactNode> = {
  fiftyFifty: <span className="font-pixel text-[11px] leading-none">50:50</span>,
  phoneFriend: <Phone className="size-6" />,
  plusOne: <UserPlus className="size-6" />,
  wiseMen: <GraduationCap className="size-6" />,
};

interface Props {
  number: number;
  used: Record<LifelineId, boolean>;
  /** Có thể dùng quyền trợ giúp ngay lúc này không (đang chọn đáp án). */
  enabled: boolean;
  busy: boolean;
  onUse: (id: LifelineId) => void;
}

export function LifelineBar({ number, used, enabled, busy, onUse }: Props) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-3" aria-label="Quyền trợ giúp">
      {LIFELINES.map((l) => {
        const locked = !isLifelineAvailableAt(l.id, number);
        const spent = used[l.id];
        const disabled = !enabled || busy || spent || locked;
        return (
          <li key={l.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onUse(l.id)}
                  aria-label={`${l.name}${spent ? " (đã dùng)" : locked ? ` (từ câu ${l.fromQuestion})` : ""}`}
                  className={cn(
                    "pixel-box relative grid h-12 w-16 place-items-center bg-secondary text-gold transition-colors",
                    "hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold",
                    "disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60 disabled:hover:bg-secondary",
                  )}
                >
                  {ICONS[l.id]}
                  {spent && (
                    <X
                      className="absolute inset-0 m-auto size-9 text-wrong"
                      strokeWidth={4}
                      aria-hidden
                    />
                  )}
                  {!spent && locked && (
                    <Lock
                      className="absolute -right-1 -bottom-1 size-4 bg-card p-0.5"
                      aria-hidden
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72 text-base">
                <p className="font-semibold">{l.name}</p>
                <p className="mt-1">{l.description}</p>
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
