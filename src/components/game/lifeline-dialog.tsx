"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/8bit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import { Progress } from "@/components/ui/8bit/progress";
import { useCountdown, useTypewriter } from "@/hooks/use-timers";
import { getLifeline } from "@/lib/game/rules";
import type { AdvisorOpinion, LifelineResult } from "@/lib/game/types";

const LETTERS = ["A", "B", "C", "D"] as const;

const TITLES: Record<
  Exclude<LifelineResult["kind"], "fiftyFifty">,
  { title: string; connecting: string }
> = {
  phoneFriend: { title: "Gọi điện thoại cho người thân", connecting: "Đang kết nối cuộc gọi..." },
  plusOne: {
    title: "Sự trợ giúp của người đồng hành",
    connecting: "Người đồng hành đang bước tới...",
  },
  wiseMen: {
    title: "Sự trợ giúp của hai nhà thông thái",
    connecting: "Đang mời hai nhà thông thái...",
  },
};

function Advisor({
  advisor,
  active,
  onDone,
}: {
  advisor: AdvisorOpinion;
  active: boolean;
  onDone: () => void;
}) {
  const shown = useTypewriter(advisor.message, active);
  const done = active && shown.length >= advisor.message.length;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);
  if (!active) return null;
  return (
    <div className="space-y-1 border-l-4 border-gold pl-3">
      <p className="text-gold">{advisor.name}</p>
      <p className="min-h-12 text-xl">{shown}</p>
      {done && (
        <p className="text-lg text-gold">
          Gợi ý: <span className="font-pixel text-sm">{LETTERS[advisor.suggested]}</span>
        </p>
      )}
    </div>
  );
}

interface Props {
  result: Exclude<LifelineResult, { kind: "fiftyFifty" }> | null;
  onClose: () => void;
}

export function LifelineDialog({ result, onClose }: Props) {
  return (
    <Dialog open={result !== null} onOpenChange={(open) => !open && onClose()}>
      {result && <LifelineBody key={JSON.stringify(result)} result={result} onClose={onClose} />}
    </Dialog>
  );
}

function LifelineBody({
  result,
  onClose,
}: {
  result: NonNullable<Props["result"]>;
  onClose: () => void;
}) {
  const def = getLifeline(result.kind);
  const meta = TITLES[result.kind];
  const [ready, setReady] = useState(false);
  const [spoken, setSpoken] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setReady(true), result.kind === "plusOne" ? 400 : 1300);
    return () => clearTimeout(id);
  }, [result.kind]);
  const timed = def.seconds !== undefined;
  const left = useCountdown(def.seconds ?? 0, ready && timed);
  const allDone = spoken >= result.advisors.length;

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-2xl text-gold">{meta.title}</DialogTitle>
        <DialogDescription className="sr-only">Kết quả quyền trợ giúp</DialogDescription>
      </DialogHeader>
      <div className="min-h-40 space-y-4 py-2" aria-live="polite">
        {!ready ? (
          <p className="animate-blink-pixel text-xl">{meta.connecting}</p>
        ) : (
          result.advisors.map((a, i) => (
            <Advisor
              key={a.name}
              advisor={a}
              active={i <= spoken}
              onDone={() => setSpoken((s) => Math.max(s, i + 1))}
            />
          ))
        )}
      </div>
      {timed && ready && (
        <div className="space-y-1">
          <Progress value={(left / (def.seconds ?? 1)) * 100} />
          <p className="text-right text-lg text-muted-foreground">
            {left > 0 ? `Còn ${Math.ceil(left)} giây` : "Hết giờ trợ giúp"}
          </p>
        </div>
      )}
      <DialogFooter>
        <Button onClick={onClose}>{allDone ? "Đã nghe xong" : "Bỏ qua"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
