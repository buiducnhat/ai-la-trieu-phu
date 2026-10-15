"use client";

import { Button } from "@/components/ui/8bit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/8bit/dialog";
import { Input } from "@/components/ui/8bit/input";
import { Label } from "@/components/ui/8bit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit/select";
import { Switch } from "@/components/ui/8bit/switch";
import { LLM_PRESETS, getPreset } from "@/lib/llm-presets";
import type { GameSettings, PublicConfig, QuestionSourceMode } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const SOURCE_OPTIONS: { id: QuestionSourceMode; label: string; hint: string }[] = [
  {
    id: "bank",
    label: "Bộ có sẵn",
    hint: "Câu hỏi từ bộ dữ liệu công khai, chơi ngay không cần mạng AI.",
  },
  { id: "llm", label: "AI tạo", hint: "Mỗi câu do AI soạn mới theo đúng độ khó." },
  { id: "mixed", label: "Xen kẽ", hint: "Ngẫu nhiên lẫn lộn giữa bộ có sẵn và câu do AI tạo." },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  config: Pick<PublicConfig, "llm" | "bankSize">;
}

export function SettingsDialog({ open, onOpenChange, settings, onChange, config }: Props) {
  const own = settings.llm.provider !== "server";
  const ownReady = own && settings.llm.apiKey.trim().length > 0;
  const aiAvailable = own ? ownReady : config.llm.configured;
  const preset = own ? getPreset(settings.llm.provider) : undefined;

  const set = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });
  const setLlm = (patch: Partial<GameSettings["llm"]>) =>
    onChange({ ...settings, llm: { ...settings.llm, ...patch } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-gold">Cài đặt</DialogTitle>
          <DialogDescription className="text-lg">
            Lưu tự động trong trình duyệt của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-xl">
          <section className="space-y-2">
            <Label>Nguồn câu hỏi</Label>
            <div role="radiogroup" aria-label="Nguồn câu hỏi" className="flex flex-wrap gap-3">
              {SOURCE_OPTIONS.map((o) => {
                const needsAi = o.id !== "bank";
                const disabled = needsAi && !aiAvailable;
                const active = settings.source === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => set({ source: o.id })}
                    className={cn(
                      "pixel-box px-3 py-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      active ? "bg-gold text-primary-foreground" : "bg-card hover:bg-accent",
                    )}
                    data-state={active ? "selected" : undefined}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-lg text-muted-foreground">
              {SOURCE_OPTIONS.find((o) => o.id === settings.source)?.hint}
              {settings.source === "bank" && ` (${config.bankSize.toLocaleString("vi-VN")} câu)`}
            </p>
            {!aiAvailable && (
              <p className="text-lg text-gold">
                Chưa có AI: máy chủ chưa đặt LLM_API_KEY, hoặc nhập khóa API riêng của bạn bên dưới.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <Label htmlFor="topic">Chủ đề ưu tiên (tùy chọn)</Label>
            <Input
              id="topic"
              value={settings.topic}
              maxLength={80}
              placeholder="Ví dụ: Lịch sử Việt Nam, Bóng đá, Âm nhạc..."
              onChange={(e) => set({ topic: e.target.value })}
            />
          </section>

          <section className="space-y-2">
            <Label>AI tạo câu hỏi</Label>
            <Select
              value={settings.llm.provider}
              onValueChange={(v) => setLlm({ provider: v, model: "" })}
            >
              <SelectTrigger aria-label="Nhà cung cấp AI">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="server">
                  {config.llm.configured
                    ? `Máy chủ (${config.llm.label})`
                    : "Máy chủ (chưa cấu hình)"}
                </SelectItem>
                {LLM_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {own && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="model">Mô hình</Label>
                  <Input
                    id="model"
                    value={settings.llm.model}
                    placeholder={preset?.defaultModel}
                    onChange={(e) => setLlm({ model: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="apikey">Khóa API</Label>
                  <Input
                    id="apikey"
                    type="password"
                    autoComplete="off"
                    value={settings.llm.apiKey}
                    placeholder="sk-..."
                    onChange={(e) => setLlm({ apiKey: e.target.value })}
                  />
                  <p className="text-lg text-muted-foreground">
                    Khóa chỉ lưu trong trình duyệt này và gửi kèm mỗi yêu cầu tạo câu hỏi tới máy
                    chủ của trò chơi (không được lưu lại).
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="flex items-center justify-between">
            <Label htmlFor="sound">Âm thanh 8-bit</Label>
            <Switch
              id="sound"
              checked={settings.sound}
              onCheckedChange={(sound) => set({ sound })}
            />
          </section>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Xong</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
