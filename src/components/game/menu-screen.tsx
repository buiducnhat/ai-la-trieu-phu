import { BookOpen, Info, Play, Settings, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import { PRIZE_LADDER, RULES_EDITION, TOTAL_QUESTIONS } from "@/lib/game/rules";
import type { GameSettings, PublicConfig } from "@/lib/game/types";
import type { Stats } from "@/lib/storage";

import { Money } from "./money";

const SOURCE_LABEL: Record<GameSettings["source"], string> = {
  bank: "Bộ câu hỏi có sẵn",
  llm: "Câu hỏi do AI tạo",
  mixed: "Xen kẽ bộ có sẵn và AI",
};

interface Props {
  settings: GameSettings;
  config: PublicConfig;
  stats: Stats;
  onStart: () => void;
  onRules: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

export function MenuScreen({
  settings,
  config,
  stats,
  onStart,
  onRules,
  onSettings,
  onCredits,
}: Props) {
  const top = PRIZE_LADDER[TOTAL_QUESTIONS - 1] as number;
  const aiOn =
    settings.llm.provider !== "server" ? settings.llm.apiKey.trim() !== "" : config.llm.configured;
  const source = aiOn ? settings.source : "bank";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-10">
      <header className="space-y-4 text-center">
        <Badge className="text-lg">{RULES_EDITION}</Badge>
        <h1 className="text-6xl leading-[0.95] tracking-wide text-gold drop-shadow-[4px_4px_0_oklch(0.1_0.05_266)] sm:text-8xl">
          AI LÀ
          <br />
          TRIỆU PHÚ
        </h1>
        <p className="text-2xl">
          {TOTAL_QUESTIONS} câu hỏi · giải thưởng cao nhất{" "}
          <Money value={top} className="text-gold" digitsClassName="text-base" />
        </p>
      </header>

      <Card className="w-full">
        <CardContent className="flex flex-col gap-4 p-6">
          <Button size="lg" className="h-14 text-2xl" onClick={onStart}>
            <Play className="size-5" /> Bắt đầu chơi
          </Button>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" onClick={onRules} className="h-11 text-xl">
              <BookOpen className="size-4" /> Luật chơi
            </Button>
            <Button variant="secondary" onClick={onSettings} className="h-11 text-xl">
              <Settings className="size-4" /> Cài đặt
            </Button>
          </div>
          <p className="text-center text-lg text-muted-foreground">
            Nguồn: {SOURCE_LABEL[source]}
            {settings.topic.trim() && ` · chủ đề “${settings.topic.trim()}”`}
            {source === "bank" && ` · ${config.bankSize.toLocaleString("vi-VN")} câu`}
          </p>
        </CardContent>
      </Card>

      {stats.games > 0 && (
        <div className="flex items-center gap-3 text-xl text-muted-foreground">
          <Trophy className="size-5 text-gold" />
          <span>
            {stats.games} ván · kỷ lục{" "}
            <Money value={stats.best} className="text-gold" digitsClassName="text-sm" />
          </span>
        </div>
      )}

      <Button variant="ghost" onClick={onCredits} className="text-lg text-muted-foreground">
        <Info className="size-4" /> Ghi công &amp; nguồn
      </Button>
    </main>
  );
}
