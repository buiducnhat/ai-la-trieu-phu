import { Button } from "@/components/ui/8bit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import {
  formatVnd,
  isMilestone,
  LIFELINES,
  PRIZE_LADDER,
  prizeOnWrongAnswer,
  RULES_EDITION,
  TOTAL_QUESTIONS,
} from "@/lib/game/rules";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RulesDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gold">Luật chơi</DialogTitle>
          <DialogDescription className="text-lg">
            Ai Là Triệu Phú — {RULES_EDITION}, VTV3.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-xl leading-snug">
          <section className="space-y-1">
            <h3 className="text-gold">Cách chơi</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Trả lời đúng liên tiếp {TOTAL_QUESTIONS} câu hỏi trắc nghiệm (4 phương án), độ khó
                tăng dần.
              </li>
              <li>Chọn một phương án rồi bấm “Khóa đáp án” để chốt câu trả lời cuối cùng.</li>
              <li>Không giới hạn thời gian suy nghĩ cho mỗi câu hỏi.</li>
              <li>
                Trước khi khóa đáp án, bạn có thể <b>dừng cuộc chơi</b> và mang về số tiền của câu
                đã trả lời đúng gần nhất.
              </li>
            </ul>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Mốc quan trọng</h3>
            <p>
              Câu 5 ({formatVnd(PRIZE_LADDER[4] as number)}) và câu 10 (
              {formatVnd(PRIZE_LADDER[9] as number)}) là các mốc quan trọng. Trả lời sai, bạn không
              về tay trắng mà nhận tiền của mốc gần nhất đã vượt qua:
            </p>
            <ul className="list-disc pl-5">
              <li>Sai ở câu 1–5: {formatVnd(prizeOnWrongAnswer(5))}</li>
              <li>Sai ở câu 6–10: {formatVnd(prizeOnWrongAnswer(6))}</li>
              <li>Sai ở câu 11–15: {formatVnd(prizeOnWrongAnswer(11))}</li>
            </ul>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Bốn quyền trợ giúp (mỗi quyền dùng một lần)</h3>
            <ul className="space-y-1">
              {LIFELINES.map((l) => (
                <li key={l.id}>
                  <b>{l.name}</b>: {l.description}
                </li>
              ))}
            </ul>
            <p className="text-lg text-muted-foreground">
              Có thể dùng nhiều quyền trợ giúp trong cùng một câu hỏi. Người trợ giúp có thể trả lời
              sai — câu càng khó, lời khuyên càng kém chắc chắn.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Thang tiền thưởng</h3>
            <ol className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {PRIZE_LADDER.map((p, i) => (
                <li
                  key={i}
                  className={
                    isMilestone(i + 1) || i + 1 === TOTAL_QUESTIONS ? "text-gold" : undefined
                  }
                >
                  Câu {i + 1}: {formatVnd(p)}
                  {isMilestone(i + 1) && " (mốc)"}
                  {i + 1 === TOTAL_QUESTIONS && " (triệu phú)"}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đã hiểu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
