import type { ReactNode } from "react";

import { Button } from "@/components/ui/8bit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import sources from "@/data/bank/sources.json";

const REPO_URL = "https://github.com/buiducnhat/ai-la-trieu-phu";
const WIKI_URL = "https://ailatrieuphu.fandom.com/vi/wiki/Ai_l%C3%A0_tri%E1%BB%87u_ph%C3%BA";
const WIKI_SOUND_URL = "https://ailatrieuphu.fandom.com/vi/wiki/%C3%82m_thanh";

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-gold underline underline-offset-2"
    >
      {children}
    </a>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditsDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gold">Ghi công &amp; nguồn</DialogTitle>
          <DialogDescription className="text-lg">
            Dự án của người hâm mộ, không chính thức.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto pr-3 text-xl leading-snug">
          <section className="space-y-1">
            <h3 className="text-gold">Chương trình gốc</h3>
            <p>
              “Ai Là Triệu Phú” là phiên bản Việt Nam của <i>Who Wants to Be a Millionaire?</i>{" "}
              (Sony Pictures Television), phát sóng trên VTV3. Game này không liên kết, không được
              bảo trợ hay xác nhận bởi VTV, Sony Pictures Television hay bất kỳ bên nào của chương
              trình; tên chương trình và các yếu tố liên quan thuộc về chủ sở hữu.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Luật chơi</h3>
            <p>
              Theo <A href={WIKI_URL}>Ai là triệu phú Wiki</A> (Fandom, CC-BY-SA), phiên bản 15 phát
              sóng từ 31/03/2026, đối chiếu với báo VTV và Tuổi Trẻ.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Âm thanh</h3>
            <p>
              Nhạc hiệu và âm thanh của chương trình, do Keith &amp; Matthew Strachan, Ramon Covalo
              và Nick Magnus sáng tác, lấy từ trang <A href={WIKI_SOUND_URL}>Âm thanh</A> trên Ai là
              triệu phú Wiki. Bản quyền thuộc chủ sở hữu; dùng ở đây để mô phỏng không khí chương
              trình, không nhằm mục đích thương mại.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Câu hỏi</h3>
            <ul className="list-disc space-y-1 pl-5">
              {sources.map((s) => (
                <li key={s.id}>
                  <A href={s.url}>{s.name}</A> ({s.count.toLocaleString("vi-VN")} câu)
                </li>
              ))}
            </ul>
            <p className="text-lg text-muted-foreground">
              Độ khó và thể loại do AI chấm lại; các nguồn trên không nêu giấy phép. Ở chế độ AI,
              mỗi câu do mô hình ngôn ngữ soạn lúc chơi và không được kiểm chứng, có thể sai.
            </p>
          </section>

          <section className="space-y-1">
            <h3 className="text-gold">Giao diện &amp; mã nguồn</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <A href="https://www.8bitcn.com/">8bitcn</A> và{" "}
                <A href="https://ui.shadcn.com/">shadcn/ui</A>
              </li>
              <li>
                Phông VT323 và Press Start 2P (SIL Open Font License) qua{" "}
                <A href="https://fontsource.org/">Fontsource</A>
              </li>
              <li>
                <A href="https://tanstack.com/start">TanStack Start</A>, React, Tailwind CSS, chạy
                trên Cloudflare Workers
              </li>
              <li>
                Mã nguồn (MIT, không gồm bộ câu hỏi và âm thanh):{" "}
                <A href={REPO_URL}>github.com/buiducnhat/ai-la-trieu-phu</A>
              </li>
            </ul>
          </section>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
