"use client";

import { ArrowRight, ListOrdered, LogOut, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/8bit/alert-dialog";
import { Badge } from "@/components/ui/8bit/badge";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent } from "@/components/ui/8bit/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import { Skeleton } from "@/components/ui/8bit/skeleton";
import { Spinner } from "@/components/ui/8bit/spinner";
import type { GameApi } from "@/hooks/use-game";
import { answeredCount } from "@/lib/game/engine";
import {
  formatVnd,
  getLifeline,
  prizeForQuestion,
  TOTAL_QUESTIONS,
  walkAwayPrize,
} from "@/lib/game/rules";
import type { GameSettings } from "@/lib/game/types";

import { AnswerButton, type AnswerState } from "./answer-button";
import { LifelineBar } from "./lifeline-bar";
import { LifelineDialog } from "./lifeline-dialog";
import { Money } from "./money";
import { PrizeLadder } from "./prize-ladder";
import { ResultPanel } from "./result-panel";

const LETTERS = ["A", "B", "C", "D"] as const;

interface Props {
  game: GameApi;
  settings: GameSettings;
  onToggleSound: () => void;
  onMenu: () => void;
}

export function PlayScreen({ game, settings, onToggleSound, onMenu }: Props) {
  const { state } = game;
  const [confirmWalk, setConfirmWalk] = useState(false);
  const [ladderOpen, setLadderOpen] = useState(false);
  const answered = answeredCount(state);
  const holding = walkAwayPrize(answered);
  const q = state.question;
  const choosing = state.phase === "choosing";
  const usesAi = settings.source !== "bank";

  function answerState(i: number): AnswerState {
    if (state.removed.includes(i)) return "removed";
    if (state.answer) {
      if (i === state.answer.correctIndex) return "correct";
      if (i === state.selected) return "wrong";
      return "idle";
    }
    if (state.selected === i) return state.phase === "locking" ? "locked" : "selected";
    return "idle";
  }

  const correctText =
    q && state.answer
      ? `${LETTERS[state.answer.correctIndex]}. ${q.options[state.answer.correctIndex]}`
      : null;

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-6xl gap-6 px-3 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-w-0 flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge className="text-lg">
              Câu {state.number}/{TOTAL_QUESTIONS}
            </Badge>
            <span className="text-xl">
              Giá trị:{" "}
              <Money
                value={prizeForQuestion(state.number)}
                className="text-gold"
                digitsClassName="text-xs"
              />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setLadderOpen(true)}
            >
              <ListOrdered className="size-4" /> Thang tiền
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSound}
              aria-label={settings.sound ? "Tắt âm thanh" : "Bật âm thanh"}
            >
              {settings.sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onMenu}>
              <LogOut className="size-4" /> Thoát
            </Button>
          </div>
        </header>

        <LifelineBar
          number={state.number}
          used={state.lifelinesUsed}
          enabled={choosing}
          busy={game.lifelineBusy}
          onUse={(id) => void game.useLifeline(id)}
        />

        {state.phase === "loading" ? (
          <LoadingCard
            number={state.number}
            error={state.error}
            usesAi={usesAi}
            onRetry={game.retryLoad}
            onMenu={onMenu}
          />
        ) : q ? (
          <>
            <Card className="w-full">
              <CardContent className="space-y-3 p-5 sm:p-8">
                {q.category && (
                  <p className="text-base text-muted-foreground sm:text-lg">{q.category}</p>
                )}
                <h2 className="text-3xl leading-snug sm:text-4xl" aria-live="polite">
                  {q.text}
                </h2>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="Các phương án">
              {q.options.map((text, i) => (
                <AnswerButton
                  key={`${q.id}-${i}`}
                  index={i}
                  text={text}
                  state={answerState(i)}
                  disabled={!choosing}
                  onClick={() => game.select(i)}
                />
              ))}
            </div>

            {state.lifelineLog.length > 0 && <HintStrip log={state.lifelineLog} />}
            {state.notice && (
              <p className="text-center text-lg text-muted-foreground">{state.notice}</p>
            )}

            {state.outcome ? (
              <ResultPanel
                outcome={state.outcome}
                answer={state.answer}
                correctText={correctText}
                onAgain={game.start}
                onMenu={onMenu}
              />
            ) : state.phase === "revealed" ? (
              <div className="flex flex-col items-center gap-3" role="status">
                <p className="text-2xl text-correct">Chính xác! Bạn đã có {formatVnd(holding)}</p>
                {state.answer?.explanation && (
                  <p className="max-w-xl text-center text-lg text-muted-foreground">
                    {state.answer.explanation}
                  </p>
                )}
                <Button className="h-12 text-xl" onClick={game.next}>
                  Câu tiếp theo <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center justify-center gap-4 bg-background/90 px-3 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <Button
                  className="h-12 min-w-48 text-xl"
                  disabled={state.selected === null || !choosing}
                  onClick={game.lock}
                >
                  {state.phase === "locking" ? "Đang kiểm tra..." : "Khóa đáp án"}
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 text-xl"
                  disabled={!choosing}
                  onClick={() => setConfirmWalk(true)}
                >
                  Dừng cuộc chơi · nhận {formatVnd(holding)}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </section>

      <aside className="hidden lg:block">
        <PrizeLadder current={state.number} answered={answered} />
      </aside>

      <Dialog open={ladderOpen} onOpenChange={setLadderOpen}>
        <DialogContent className="flex max-h-[90dvh] max-w-sm flex-col">
          <DialogHeader>
            <DialogTitle className="text-gold">Thang tiền</DialogTitle>
            <DialogDescription className="sr-only">Thang tiền thưởng 15 câu hỏi</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-3">
            <PrizeLadder current={state.number} answered={answered} />
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmWalk} onOpenChange={setConfirmWalk}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dừng cuộc chơi?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sẽ mang về {formatVnd(holding)} và kết thúc ván này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Chơi tiếp</AlertDialogCancel>
            <AlertDialogAction onClick={() => void game.walkAway()}>
              Dừng và nhận tiền
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LifelineDialog
        result={
          game.pendingLifeline && game.pendingLifeline.kind !== "fiftyFifty"
            ? game.pendingLifeline
            : null
        }
        onClose={game.dismissLifeline}
      />
    </main>
  );
}

function LoadingCard({
  number,
  error,
  usesAi,
  onRetry,
  onMenu,
}: {
  number: number;
  error: string | null;
  usesAi: boolean;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <Card className="w-full">
      <CardContent
        className="flex flex-col items-center gap-4 p-8 text-center"
        role="status"
        aria-live="polite"
      >
        {error ? (
          <>
            <p className="text-xl text-wrong">{error}</p>
            <div className="flex gap-3">
              <Button onClick={onRetry}>Thử lại</Button>
              <Button variant="secondary" onClick={onMenu}>
                Về màn hình chính
              </Button>
            </div>
          </>
        ) : (
          <>
            <Spinner className="size-10" />
            <p className="text-xl">
              {usesAi ? "Đang chuẩn bị" : "Đang lấy"} câu hỏi số {number}...
            </p>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function HintStrip({ log }: { log: GameApi["state"]["lifelineLog"] }) {
  return (
    <ul
      className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-lg text-gold"
      aria-label="Gợi ý đã nhận"
    >
      {log.map((r, i) => {
        if (r.kind === "fiftyFifty") {
          return <li key={i}>50:50: đã loại 2 phương án</li>;
        }
        const label = getLifeline(r.kind).short;
        return (
          <li key={i}>
            {label}: {r.advisors.map((a) => LETTERS[a.suggested]).join(" · ")}
          </li>
        );
      })}
    </ul>
  );
}
