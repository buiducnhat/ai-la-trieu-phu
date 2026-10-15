import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import type { Outcome } from "@/lib/game/engine";
import { TOTAL_QUESTIONS } from "@/lib/game/rules";
import type { AnswerResult } from "@/lib/game/types";

import { Money } from "./money";

const TITLES: Record<Outcome["reason"], string> = {
  won: "BẠN LÀ TRIỆU PHÚ!",
  walkAway: "Bạn đã dừng cuộc chơi",
  wrong: "Rất tiếc, đáp án chưa đúng",
};

interface Props {
  outcome: Outcome;
  answer: AnswerResult | null;
  correctText: string | null;
  onAgain: () => void;
  onMenu: () => void;
}

export function ResultPanel({ outcome, answer, correctText, onAgain, onMenu }: Props) {
  const won = outcome.reason === "won";
  return (
    <Card className="w-full" role="status" aria-live="polite">
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <h2 className={`text-4xl leading-tight sm:text-5xl ${won ? "text-gold" : ""}`}>
          {TITLES[outcome.reason]}
        </h2>
        <p className="text-2xl">
          Bạn nhận được
          <br />
          <Money
            value={outcome.prize}
            className="text-gold"
            digitsClassName="text-xl sm:text-2xl"
          />
        </p>
        <p className="text-xl text-muted-foreground">
          Trả lời đúng {outcome.answered}/{TOTAL_QUESTIONS} câu
        </p>
        {answer && !won && correctText && (
          <p className="text-xl">
            Đáp án đúng: <span className="text-correct">{correctText}</span>
          </p>
        )}
        {answer?.explanation && (
          <p className="max-w-xl text-lg text-muted-foreground">{answer.explanation}</p>
        )}
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <Button onClick={onAgain} className="h-11 text-xl">
            Chơi ván mới
          </Button>
          <Button variant="secondary" onClick={onMenu} className="h-11 text-xl">
            Về màn hình chính
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
